// TypeScript
// src/encoding/FeatureEncoder.ts
import * as tf from "@tensorflow/tfjs";
import {
    CategoricalSpec,
    FeatureSpec,
    FieldSpec,
    MultiCategoricalSpec,
    NumericSpec,
    PrimitiveListSpec,
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

        // Derive dims from the Spec object (no fit required).
        const deriveFields = (fields: FieldSpec[]): FittedFieldSpec[] => {
            return fields.map((f) => {
                // Dict: compute dims from nested fields and propagate metadata if present
                if ((f as any).kind === "dict") {
                    const df = f as DictSpec;
                    let subtotal = 0;
                    const subFields: FittedFieldSpec[] = df.fields.map((sub) => {
                        if (sub.kind === "numeric") {
                            (sub as any).__dim = 1;
                        } else if (sub.kind === "boolean") {
                            (sub as any).__dim = 1;
                        } else if (sub.kind === "categorical") {
                            const cf = sub as CategoricalSpec;
                            if ((cf as any).hashing) {
                                (sub as any).__dim = 32;
                            } else {
                                (sub as any).__dim = (cf.vocab?.length ?? 0);
                            }
                        } else if (sub.kind === "multi_categorical") {
                            const mf = sub as MultiCategoricalSpec;
                            if ((mf as any).hashing) {
                                (sub as any).__dim = 64;
                            } else {
                                (sub as any).__dim = (mf.vocab?.length ?? 0);
                            }
                        } else {
                            (sub as any).__dim = 0;
                        }
                        subtotal += (sub as any).__dim;
                        return sub as any;
                    });
                    return {...df, fields: subFields, __dim: subtotal} as any;
                }

                // List: fixed-length list of numeric/boolean values (flattened)
                else if ((f as any).kind === "list") {
                    const lf = f as PrimitiveListSpec;
                    let subtotal = 0;
                    // store per-position metadata on the list spec (for future extension)
                    (lf as any).__perPosDim = [];
                    for (let i = 0; i < lf.length; i++) {
                        const cont = lf.contains;
                        if (cont === "numeric" || cont === "boolean") {
                            (lf as any).__perPosDim[i] = 1;
                            subtotal += 1;
                        } else {
                            (lf as any).__perPosDim[i] = 0;
                        }
                    }
                    (lf as any).__perPosDim = (lf as any).__perPosDim ?? [];
                    return {...lf, __dim: subtotal} as any;
                }

                // Singular types
                else {
                    if (f.kind === "numeric") {
                        (f as any).__dim = 1;
                    } else if (f.kind === "boolean") {
                        (f as any).__dim = 1;
                    } else if (f.kind === "categorical") {
                        const cf = f as CategoricalSpec;
                        if ((cf as any).hashing) (f as any).__dim = 32;
                        else (f as any).__dim = (cf.vocab?.length ?? 0);
                    } else if (f.kind === "multi_categorical") {
                        const mf = f as MultiCategoricalSpec;
                        if ((mf as any).hashing) (f as any).__dim = 64;
                        else (f as any).__dim = (mf.vocab?.length ?? 0);
                    } else {
                        (f as any).__dim = 0;
                    }
                    return f as any;
                }
            });
        };

        const fields = deriveFields(spec.fields);
        const total = fields.reduce((acc, f) => acc + ((f as any).__dim || 0), 0);
        this.spec = {...spec, fields, __totalDim: total} as FittedModelSpec;
    }

    /** Encode a single object to a flat feature vector (1D JS array). */
    private encodeOne(obj: Record<string, any>, numericStats: Record<string, {mean?: number; std?: number; min?: number; max?: number; count: number}>): number[] {
        const out: number[] = [];
        for (const f of this.spec.fields) {
            const v = obj?.[f.key];

            // Dict: flatten nested fields
            if ((f as any).kind === "dict") {
                const df = f as FittedDictSpec;
                const objVal = v ?? {};
                for (const sub of df.fields) {
                    const subVal = objVal?.[sub.key];
                    const statKey = `${f.key}.${sub.key}`;
                    const s = numericStats[statKey];
                    switch (sub.kind) {
                        case "numeric": {
                            let x = (typeof subVal === "number") ? subVal : ((sub as NumericSpec).impute ?? 0);
                            const nf = sub as NumericSpec;
                            if (nf.normalize === "standard" && s?.count && s.std && s.std > 0) {
                                x = (x - (s.mean ?? 0)) / s.std;
                            } else if (nf.normalize === "minmax" && s && typeof s.max === "number" && typeof s.min === "number" && (s.max! > s.min!)) {
                                x = (x - (s.min ?? 0)) / Math.max(1e-9, (s.max! - s.min!));
                            }
                            out.push(x);
                            break;
                        }
                        case "boolean":
                            out.push(subVal ? 1 : 0);
                            break;
                        case "categorical": {
                            const cf = sub as FittedCategoricalSpec;
                            const dim = sub.__dim ?? 0;
                            const slice = new Array<number>(dim).fill(0);
                            if (dim > 0) {
                                if ((cf as any).hashing) {
                                    const idx = mod(hashStr(String(subVal ?? "")), dim);
                                    slice[idx] = 1;
                                } else {
                                    const idx = cf.vocab?.indexOf(String(subVal ?? ""));
                                    if (idx != null && idx >= 0 && idx < dim) slice[idx] = 1;
                                    else if ((cf.vocab?.length ?? 0) < dim) slice[(cf.vocab?.length ?? 0)] = 1; // OOV if space available
                                }
                            }
                            out.push(...slice);
                            break;
                        }
                        case "multi_categorical": {
                            const mf = sub as MultiCategoricalSpec;
                            const vals = Array.isArray(subVal) ? subVal.map(String) : [];
                            const dim = sub.__dim ?? 0;
                            const slice = new Array<number>(dim).fill(0);
                            if (dim > 0) {
                                if ((mf as any).hashing) {
                                    for (const t of vals) slice[mod(hashStr(t), dim)] = 1;
                                } else {
                                    for (const t of vals) {
                                        const idx = mf.vocab?.indexOf(t);
                                        if (idx != null && idx >= 0 && idx < dim) slice[idx] = 1;
                                        else if ((mf.vocab?.length ?? 0) < dim) slice[(mf.vocab?.length ?? 0)] = 1; // OOV if space available
                                    }
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
                const lf = f as PrimitiveListSpec;
                const arr = Array.isArray(v) ? v : [];
                for (let i = 0; i < lf.length; i++) {
                    const elem = arr[i];
                    const cont = lf.contains;
                    const statKey = `${f.key}#${i}`;
                    const s = numericStats[statKey];
                    if (cont === "numeric") {
                        let x = (typeof elem === "number") ? elem : 0;
                        // Lists in ModelSpecs do not carry normalization config; but if someone put normalize on a separate per-pos config, this code can be extended.
                        if (s && s.count && s.std && s.std > 0 && false) {
                            // @ts-ignore
                            x = (x - (s.mean ?? 0)) / s.std;
                        } else if (s && typeof s.max === "number" && typeof s.min === "number" && false) {
                            x = (x - (s.min ?? 0)) / Math.max(1e-9, (s.max! - s.min!));
                        }
                        out.push(x);
                    } else if (cont === "boolean") {
                        out.push(elem ? 1 : 0);
                    } else {
                        // unsupported types -> skip (no dims)
                    }
                }
                continue;
            }

            // Existing singular encoding
            switch (f.kind) {
                case "numeric": {
                    const statKey = f.key;
                    const s = numericStats[statKey];
                    let x = (typeof v === "number") ? v : ((f as NumericSpec).impute ?? 0);
                    const nf = f as NumericSpec;
                    if (nf.normalize === "standard" && s?.count && s.std && s.std > 0) x = (x - (s.mean ?? 0)) / s.std;
                    else if (nf.normalize === "minmax" && s && typeof s.max === "number" && typeof s.min === "number" && (s.max! > s.min!)) x = (x - (s.min ?? 0)) / Math.max(1e-9, (s.max! - s.min!));
                    out.push(x);
                    break;
                }
                case "boolean":
                    out.push(v ? 1 : 0);
                    break;
                case "categorical": {
                    const cf = f as CategoricalSpec;
                    const dim = (f as any).__dim ?? 0;
                    const slice = new Array<number>(dim).fill(0);
                    if (dim > 0) {
                        if ((cf as any).hashing) {
                            const idx = mod(hashStr(String(v ?? "")), dim);
                            slice[idx] = 1;
                        } else {
                            const idx = cf.vocab?.indexOf(String(v ?? ""));
                            if (idx != null && idx >= 0 && idx < dim) slice[idx] = 1;
                            else if ((cf.vocab?.length ?? 0) < dim) slice[(cf.vocab?.length ?? 0)] = 1; // OOV
                        }
                    }
                    out.push(...slice);
                    break;
                }
                case "multi_categorical": {
                    const mf = f as MultiCategoricalSpec;
                    const vals = Array.isArray(v) ? v.map(String) : [];
                    const dim = (f as any).__dim ?? 0;
                    const slice = new Array<number>(dim).fill(0);
                    if (dim > 0) {
                        if ((mf as any).hashing) {
                            for (const t of vals) slice[mod(hashStr(t), dim)] = 1;
                        } else {
                            for (const t of vals) {
                                const idx = mf.vocab?.indexOf(t);
                                if (idx != null && idx >= 0) slice[idx] = 1;
                                else slice[(mf.vocab?.length ?? 0)] = 1; // OOV
                            }
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
        // Compute numeric stats from the provided set (per-call)
        const numericAccs: Record<string, {count: number; sum: number; sumsq: number; min: number; max: number}> = {};

        const bumpNumeric = (key: string, val: number | undefined) => {
            if (typeof val !== "number") return;
            const s = numericAccs[key] ?? {count: 0, sum: 0, sumsq: 0, min: +Infinity, max: -Infinity};
            s.count++;
            s.sum += val;
            s.sumsq += val * val;
            s.min = Math.min(s.min, val);
            s.max = Math.max(s.max, val);
            numericAccs[key] = s;
        };

        for (const obj of set) {
            for (const f of this.spec.fields) {
                const v = obj?.[f.key];

                // dict numeric subs
                if ((f as any).kind === "dict") {
                    const df = f as DictSpec;
                    const objVal = v ?? {};
                    for (const sub of df.fields) {
                        if (sub.kind === "numeric") {
                            const subVal = objVal?.[sub.key];
                            bumpNumeric(`${f.key}.${sub.key}`, subVal);
                        }
                    }
                    continue;
                }

                // list numeric positions
                if ((f as any).kind === "list") {
                    const lf = f as PrimitiveListSpec;
                    const arr = Array.isArray(v) ? v : [];
                    for (let i = 0; i < lf.length; i++) {
                        if (lf.contains === "numeric") {
                            const elem = arr[i];
                            bumpNumeric(`${f.key}#${i}`, elem);
                        }
                    }
                    continue;
                }

                // singular numeric
                if (f.kind === "numeric") {
                    if (typeof v === "number") bumpNumeric(f.key, v);
                }
            }
        }

        // finalize numeric stats (mean/std/min/max)
        const numericStats: Record<string, {mean?: number; std?: number; min?: number; max?: number; count: number}> = {};
        for (const [k, acc] of Object.entries(numericAccs)) {
            const mean = acc.sum / acc.count;
            const var_ = Math.max(1e-12, acc.sumsq / acc.count - mean * mean);
            const std = Math.sqrt(var_);
            numericStats[k] = {mean, std, min: acc.min, max: acc.max, count: acc.count};
        }

        const D = (this.spec as any).__totalDim as number;

        const encodeMatrix = (items: Record<string, any>[]) => items.map(o => this.encodeOne(o, numericStats));

        if (this.spec.setEncoding === "pad" || !this.spec.setEncoding) {
            const K = this.spec.maxObjects!;
            if (K === undefined) throw new Error("maxObjects must be defined for 'pad' setEncoding.");
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
            const pooled = tf.zeros([D]) as tf.Tensor;
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
