// TypeScript
import * as tf from "@tensorflow/tfjs";
import {
    CategoricalSpec,
    FeatureSpec,
    FieldSpec,
    MultiCategoricalSpec,
    NumericSpec,
    ListSpec,
    DictSpec
} from "../specification/ModelSpecs";

export interface FittedModelSpec extends FeatureSpec {
    fields: FittedFieldSpec[]; // concrete output dim for each field
    __totalDim: number;
}

export type FittedFieldSpec = FieldSpec & { __dim: number };

type FittedDictSpec = DictSpec & { fields: FittedFieldSpec[]; __dim: number };

type FittedCategoricalSpec = CategoricalSpec & { vocab: string[]; __dim: number };

export class FeatureEncoder {
    private spec: FittedModelSpec;

    constructor(spec: FeatureSpec) {
        if (spec.setEncoding == "pad" && (!spec.maxObjects || spec.maxObjects <= 0)) {
            throw new Error("maxObjects must be a positive integer when using 'pad' setEncoding.");
        }
        // We'll complete dims later in fit()
        this.spec = {...spec, fields: spec.fields.map(f => ({...f, __dim: 0})), __totalDim: 0};
    }

    /** Scan a dataset to learn vocabularies/statistics. */
    fit(dataset: Record<string, any>[]) {
        // Collectors
        const catCounts: Record<string, Map<string, number>> = {};
        const textCounts: Record<string, Map<string, number>> = {};
        let numericStats: Record<string, { count: number, sum: number, sumsq: number, min: number, max: number }> = {};

        const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);

        for (const obj of dataset) {
            for (const f of this.spec.fields) {
                const v = obj?.[f.key];

                // Helper to update numeric stats for a key
                const updNumeric = (key: string, val: number | undefined) => {
                    if (val == null) return;
                    const s = numericStats[key] ?? {
                        count: 0,
                        sum: 0,
                        sumsq: 0,
                        min: +Infinity,
                        max: -Infinity
                    };
                    s.count++;
                    s.sum += val;
                    s.sumsq += val * val;
                    s.min = Math.min(s.min, val);
                    s.max = Math.max(s.max, val);
                    numericStats[key] = s;
                };

                // Handle nested dict fields
                if ((f as any).kind === "dict") {
                    const df = f as DictSpec;
                    const objVal = v ?? {};
                    for (const sub of df.fields) {
                        const subVal = objVal?.[sub.key];
                        const subKey = `${f.key}.${sub.key}`;
                        switch (sub.kind) {
                            case "numeric":
                                if (subVal != null) updNumeric(subKey, subVal);
                                break;
                            case "categorical":
                                if ((sub as any).hashing) break;
                                const cmap = catCounts[subKey] ?? new Map<string, number>();
                                if (subVal != null) bump(cmap, String(subVal));
                                catCounts[subKey] = cmap;
                                break;
                            case "multi_categorical":
                                if ((sub as any).hashing) break;
                                const mmap = catCounts[subKey] ?? new Map<string, number>();
                                if (Array.isArray(subVal)) for (const t of subVal) bump(mmap, String(t));
                                catCounts[subKey] = mmap;
                                break;
                            case "boolean":
                                break;
                        }
                    }
                    continue;
                }

                // Handle fixed-length lists of singular kinds
                if ((f as any).kind === "list") {
                    const lf = f as ListSpec;
                    const arr = Array.isArray(v) ? v : [];
                    // Treat each position independently (positional features)
                    for (let i = 0; i < lf.length; i++) {
                        const elem = arr[i];
                        const posKey = `${f.key}#${i}`;
                        const cont = lf.contains;
                        switch (cont) {
                            case "numeric":
                                if (elem != null) updNumeric(posKey, elem);
                                break;
                            // case "categorical":
                            //     // no hashing info in ListSpec, assume vocab-building
                            //     const cmap = catCounts[posKey] ?? new Map<string, number>();
                            //     if (elem != null) bump(cmap, String(elem));
                            //     catCounts[posKey] = cmap;
                            //     break;
                            // case "multi_categorical":
                            //     const mmap = catCounts[posKey] ?? new Map<string, number>();
                            //     if (Array.isArray(elem)) for (const t of elem) bump(mmap, String(t));
                            //     catCounts[posKey] = mmap;
                            //     break;
                            case "boolean":
                                break;
                            default:
                                // unsupported nested "list" or others: skip
                                break;
                        }
                    }
                    continue;
                }

                // Existing singular handling
                switch (f.kind) {
                    case "numeric": {
                        if (v == null) break;
                        const s = numericStats[f.key] ?? {
                            count: 0,
                            sum: 0,
                            sumsq: 0,
                            min: +Infinity,
                            max: -Infinity
                        };
                        s.count++;
                        s.sum += v;
                        s.sumsq += v * v;
                        s.min = Math.min(s.min, v);
                        s.max = Math.max(s.max, v);
                        numericStats[f.key] = s;
                        break;
                    }
                    case "categorical": {
                        if ((f as any).hashing) break;
                        const map = catCounts[f.key] ?? new Map<string, number>();
                        if (v != null) bump(map, String(v));
                        catCounts[f.key] = map;
                        break;
                    }
                    case "multi_categorical": {
                        if ((f as any).hashing) break;
                        const map = catCounts[f.key] ?? new Map<string, number>();
                        if (Array.isArray(v)) for (const t of v) bump(map, String(t));
                        catCounts[f.key] = map;
                        break;
                    }
                    case "boolean":
                        break;
                }
            }
        }

        // Finalize stats/vocabs and compute dims
        let total = 0;
        this.spec.fields = this.spec.fields.map((f) => {
            // Dict: compute dims from nested fields and propagate metadata
            if ((f as any).kind === "dict") {
                const df = f as DictSpec;
                let subtotal = 0;
                df.fields = df.fields.map((sub) => {
                    if (sub.kind === "numeric") {
                        const s = numericStats[`${f.key}.${sub.key}`];
                        if ((sub as NumericSpec).normalize === "standard" && s?.count) {
                            (sub as NumericSpec).mean = s.sum / s.count;
                            const var_ = Math.max(1e-12, s.sumsq / s.count - (sub as NumericSpec).mean! ** 2);
                            (sub as NumericSpec).std = Math.sqrt(var_);
                        } else if ((sub as NumericSpec).normalize === "minmax" && s) {
                            (sub as NumericSpec).min = s.min;
                            (sub as NumericSpec).max = s.max;
                        }
                        (sub as any).__dim = 1;
                    } else if (sub.kind === "boolean") {
                        (sub as any).__dim = 1;
                    } else if (sub.kind === "categorical") {
                        const cf = sub as CategoricalSpec;
                        if (!cf.hashing) {
                            const counts = catCounts[`${f.key}.${sub.key}`] ?? new Map<string, number>();
                            let vocab = cf.vocab ?? [...counts.entries()]
                                .sort((a, b) => b[1] - a[1])
                                .map(([w]) => w);
                            if (cf.maxVocab) vocab = vocab.slice(0, cf.maxVocab);
                            cf.vocab = vocab;
                            (sub as any).__dim = (cf.vocab?.length ?? 0);
                        } else {
                            (sub as any).__dim = 32;
                        }
                    } else if (sub.kind === "multi_categorical") {
                        const mf = sub as MultiCategoricalSpec;
                        if (!mf.hashing) {
                            const counts = catCounts[`${f.key}.${sub.key}`] ?? new Map<string, number>();
                            let vocab = mf.vocab ?? [...counts.entries()]
                                .sort((a, b) => b[1] - a[1])
                                .map(([w]) => w);
                            if (mf.maxVocab) vocab = vocab.slice(0, mf.maxVocab);
                            mf.vocab = vocab;
                            (sub as any).__dim = (mf.vocab?.length ?? 0);
                        } else {
                            (sub as any).__dim = 64;
                        }
                    }
                    subtotal += (sub as any).__dim;
                    return sub as any;
                });
                (f as any).__dim = subtotal;
            }
            // List: fixed-length list of singular kinds
            else if ((f as any).kind === "list") {
                const lf = f as ListSpec;
                let subtotal = 0;
                // store per-position metadata (vocabs/dims) on the list spec
                (lf as any).__perPosVocab = [];
                (lf as any).__perPosDim = [];
                for (let i = 0; i < lf.length; i++) {
                    const posKey = `${f.key}#${i}`;
                    const cont = lf.contains;
                    if (cont === "numeric") {
                        (lf as any).__perPosDim[i] = 1;
                        subtotal += 1;
                    } else if (cont === "boolean") {
                        (lf as any).__perPosDim[i] = 1;
                        subtotal += 1;
                    } else if (cont === "categorical") {
                        const counts = catCounts[posKey] ?? new Map<string, number>();
                        let vocab = [...counts.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .map(([w]) => w);
                        // no maxVocab on ListSpec; store full vocab
                        (lf as any).__perPosVocab[i] = vocab;
                        (lf as any).__perPosDim[i] = vocab.length;
                        subtotal += vocab.length;
                    } else if (cont === "multi_categorical") {
                        const counts = catCounts[posKey] ?? new Map<string, number>();
                        let vocab = [...counts.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .map(([w]) => w);
                        (lf as any).__perPosVocab[i] = vocab;
                        (lf as any).__perPosDim[i] = vocab.length;
                        subtotal += vocab.length;
                    } else {
                        // unsupported nested list/list-of-list; treat as zero-dim
                        (lf as any).__perPosDim[i] = 0;
                    }
                }
                (f as any).__dim = subtotal;
            }
            // Singular types (existing logic)
            else if (f.kind === "numeric") {
                const s = numericStats[f.key];
                if ((f as NumericSpec).normalize === "standard" && s?.count) {
                    (f as NumericSpec).mean = s.sum / s.count;
                    const var_ = Math.max(1e-12, s.sumsq / s.count - (f as NumericSpec).mean! ** 2);
                    (f as NumericSpec).std = Math.sqrt(var_);
                } else if ((f as NumericSpec).normalize === "minmax" && s) {
                    (f as NumericSpec).min = s.min;
                    (f as NumericSpec).max = s.max;
                }
                (f as any).__dim = 1;
            } else if (f.kind === "boolean") {
                (f as any).__dim = 1;
            } else if (f.kind === "categorical") {
                const cf = f as CategoricalSpec;
                if (!cf.hashing) {
                    const counts = catCounts[f.key] ?? new Map<string, number>();
                    let vocab = cf.vocab ?? [...counts.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([w]) => w);
                    if (cf.maxVocab) vocab = vocab.slice(0, cf.maxVocab);
                    cf.vocab = vocab;
                    // one-hot size = vocab
                    (f as any).__dim = (cf.vocab?.length ?? 0);
                } else {
                    (f as any).__dim = 32; // hashing buckets
                }
            } else if (f.kind === "multi_categorical") {
                const mf = f as MultiCategoricalSpec;
                if (!mf.hashing) {
                    const counts = catCounts[f.key] ?? new Map<string, number>();
                    let vocab = mf.vocab ?? [...counts.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([w]) => w);
                    if (mf.maxVocab) vocab = vocab.slice(0, mf.maxVocab);
                    mf.vocab = vocab;
                    (f as any).__dim = (mf.vocab?.length ?? 0);
                } else {
                    (f as any).__dim = 64;
                }
            }
            total += (f as any).__dim;
            return f as any;
        });

        (this.spec as any).__totalDim = total;
    }

    /** Encode a single object to a flat feature vector (1D JS array). */
    private encodeOne(obj: Record<string, any>): number[] {
        const out: number[] = [];
        for (const f of this.spec.fields) {
            const v = obj?.[f.key];
            // Dict: flatten nested fields
            if ((f as any).kind === "dict") {
                const df = f as FittedDictSpec;
                const objVal = v ?? {};
                for (const sub of df.fields) {
                    const subVal = objVal?.[sub.key];
                    switch (sub.kind) {
                        case "numeric": {
                            let x = (typeof subVal === "number") ? subVal : ((sub as NumericSpec).impute ?? 0);
                            const nf = sub as NumericSpec;
                            if (nf.normalize === "standard" && nf.std && nf.std > 0) x = (x - (nf.mean ?? 0)) / nf.std;
                            else if (nf.normalize === "minmax" && nf.max! > nf.min!) x = (x - (nf.min ?? 0)) / Math.max(1e-9, (nf.max! - nf.min!));
                            out.push(x);
                            break;
                        }
                        case "boolean":
                            out.push(subVal ? 1 : 0);
                            break;
                        case "categorical": {
                            const cf = sub as FittedCategoricalSpec;
                            const slice = new Array<number>(sub.__dim).fill(0);
                            if (cf.hashing) {
                                const idx = mod(hashStr(String(subVal ?? "")), sub.__dim);
                                slice[idx] = 1;
                            } else {
                                const idx = cf.vocab?.indexOf(String(subVal ?? ""));
                                if (idx != null && idx >= 0) slice[idx] = 1;
                                else slice[(cf.vocab?.length ?? 0)] = 1; // OOV
                            }
                            out.push(...slice);
                            break;
                        }
                        case "multi_categorical": {
                            const mf = sub as MultiCategoricalSpec;
                            const vals = Array.isArray(subVal) ? subVal.map(String) : [];
                            const slice = new Array<number>(sub.__dim).fill(0);
                            if (mf.hashing) {
                                for (const t of vals) slice[mod(hashStr(t), sub.__dim)] = 1;
                            } else {
                                for (const t of vals) {
                                    const idx = mf.vocab?.indexOf(t);
                                    if (idx != null && idx >= 0) slice[idx] = 1;
                                    else slice[(mf.vocab?.length ?? 0)] = 1; // OOV
                                }
                            }
                            out.push(...slice);
                            break;
                        }
                    }
                }
                continue;
            }

            // List: fixed-length list of contained singular kinds, flattened by position
            if ((f as any).kind === "list") {
                const lf = f as ListSpec;
                const arr = Array.isArray(v) ? v : [];
                for (let i = 0; i < lf.length; i++) {
                    const elem = arr[i];
                    const cont = lf.contains;
                    if (cont === "numeric") {
                        let x = (typeof elem === "number") ? elem : 0;
                        out.push(x);
                    } else if (cont === "boolean") {
                        out.push(elem ? 1 : 0);
                    } else if (cont === "categorical") {
                        const vocab = (lf as any).__perPosVocab?.[i] ?? [];
                        const dim = (lf as any).__perPosDim?.[i] ?? vocab.length;
                        const slice = new Array<number>(dim).fill(0);
                        const idx = vocab.indexOf(String(elem ?? ""));
                        if (idx >= 0) slice[idx] = 1;
                        else slice[vocab.length] = 1; // OOV
                        out.push(...slice);
                    } else if (cont === "multi_categorical") {
                        const vocab = (lf as any).__perPosVocab?.[i] ?? [];
                        const dim = (lf as any).__perPosDim?.[i] ?? vocab.length;
                        const slice = new Array<number>(dim).fill(0);
                        const vals = Array.isArray(elem) ? elem.map(String) : [];
                        for (const t of vals) {
                            const idx = vocab.indexOf(t);
                            if (idx >= 0) slice[idx] = 1;
                            else slice[vocab.length] = 1; // OOV
                        }
                        out.push(...slice);
                    } else {
                        // unsupported types -> skip (no dims)
                    }
                }
                continue;
            }

            // Existing singular encoding
            switch (f.kind) {
                case "numeric": {
                    let x = (typeof v === "number") ? v : ((f as NumericSpec).impute ?? 0);
                    const nf = f as NumericSpec;
                    if (nf.normalize === "standard" && nf.std && nf.std > 0) x = (x - (nf.mean ?? 0)) / nf.std;
                    else if (nf.normalize === "minmax" && nf.max! > nf.min!) x = (x - (nf.min ?? 0)) / Math.max(1e-9, (nf.max! - nf.min!));
                    out.push(x);
                    break;
                }
                case "boolean":
                    out.push(v ? 1 : 0);
                    break;
                case "categorical": {
                    const cf = f as CategoricalSpec;
                    const slice = new Array<number>(f.__dim).fill(0);
                    if (cf.hashing) {
                        const idx = mod(hashStr(String(v ?? "")), f.__dim);
                        slice[idx] = 1;
                    } else {
                        const idx = cf.vocab?.indexOf(String(v ?? ""));
                        if (idx != null && idx >= 0) slice[idx] = 1;
                        else slice[(cf.vocab?.length ?? 0)] = 1; // OOV
                    }
                    out.push(...slice);
                    break;
                }
                case "multi_categorical": {
                    const mf = f as MultiCategoricalSpec;
                    const vals = Array.isArray(v) ? v.map(String) : [];
                    const slice = new Array<number>(f.__dim).fill(0);
                    if (mf.hashing) {
                        for (const t of vals) slice[mod(hashStr(t), f.__dim)] = 1;
                    } else {
                        for (const t of vals) {
                            const idx = mf.vocab?.indexOf(t);
                            if (idx != null && idx >= 0) slice[idx] = 1;
                            else slice[(mf.vocab?.length ?? 0)] = 1; // OOV
                        }
                    }
                    out.push(...slice);
                    break;
                }
            }
        }
        return out;
    }

    transformState(state: Record<string, any>): {
        x: tf.Tensor;            // [K, D] if pad; or [D] if pooled
        mask?: tf.Tensor;        // [K] (1=valid, 0=pad) if pad
        meta: { perItemDim: number; count: number }
    } {
        return this.transform([state]);
    }

    /** Encode a variable-size set of objects -> tensor(s). */
    transform(set: Record<string, any>[]): {
        x: tf.Tensor;            // [K, D] if pad; or [D] if pooled
        mask?: tf.Tensor;        // [K] (1=valid, 0=pad) if pad
        meta: { perItemDim: number; count: number }
    } {
        const D = (this.spec as any).__totalDim as number;

        const encodeMatrix = (items: Record<string, any>[]) => items.map(o => this.encodeOne(o));

        if (this.spec.setEncoding === "pad" || !this.spec.setEncoding) {
            const K = this.spec.maxObjects!;
            if(K === undefined) throw new Error("maxObjects must be defined for 'pad' setEncoding.");
            const items = set.slice(0, K);
            const mat = encodeMatrix(items);
            // pad rows
            while (mat.length < K) mat.push(new Array<number>(D).fill(0));
            const mask = new Array<number>(K).fill(0).map((_, i) => (i < set.length ? 1 : 0));
            const x = tf.tensor2d(mat, [K, D]);
            const m = tf.tensor1d(mask, "float32");
            return {x, mask: m, meta: {perItemDim: D, count: set.length}};
        }

        // Permutation-invariant pooling
        const mat = encodeMatrix(set);
        if (mat.length === 0) {
            const zero = tf.zeros([(this.spec.setEncoding ? D : this.spec.maxObjects!), D]);
            const pooled = (this.spec.setEncoding ? tf.zeros([D]) : zero) as tf.Tensor;
            return {x: pooled, meta: {perItemDim: D, count: 0}};
        }
        const x2d = tf.tensor2d(mat, [mat.length, D]);
        let pooled: tf.Tensor;
        switch (this.spec.setEncoding) {
            case "mean":
                pooled = tf.mean(x2d, 0);
                break;
            case "sum":
                pooled = tf.sum(x2d, 0);
                break;
            case "max":
                pooled = tf.max(x2d, 0);
                break;
            default:
                pooled = tf.mean(x2d, 0);
                break;
        }
        return {x: pooled, meta: {perItemDim: D, count: mat.length}};
    }

    /** Encode a batch of sets -> tensors shaped for training. */
    transformBatch(batch: Record<string, any>[][]): {
        x: tf.Tensor;     // if pad: [B, K, D]; if pooled: [B, D]
        mask?: tf.Tensor; // if pad: [B, K]
    } {
        if (this.spec.setEncoding === "pad" || !this.spec.setEncoding) {
            const K = this.spec.maxObjects!;
            const D = (this.spec as any).__totalDim as number;
            const mats: number[][][] = [];
            const masks: number[][] = [];
            for (const set of batch) {
                const t = this.transform(set);
                mats.push((t.x.arraySync() as number[][]));
                masks.push((t.mask!.arraySync() as number[]));
            }
            const x = tf.tensor3d(mats, [batch.length, K, D]);
            const m = tf.tensor2d(masks, [batch.length, K]);
            return {x, mask: m};
        } else {
            const rows: number[][] = [];
            for (const set of batch) {
                const {x} = this.transform(set);
                rows.push((x.arraySync() as number[]));
            }
            const x = tf.tensor2d(rows, [batch.length, (this.spec as any).__totalDim as number]);
            return {x};
        }
    }

    get fitted(): FittedModelSpec {
        return this.spec;
    }
}

// --- small helpers ---
function tokenize(s: string): string[] {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function hashStr(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

const mod = (n: number, m: number) => (n % m);
