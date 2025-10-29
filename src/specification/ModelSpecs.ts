// Core types your app can extend
export type SingularFieldKind = "numeric" | "boolean" | "categorical" | "text" | "multi_categorical";
export type FieldKind = SingularFieldKind | "list";

export interface BaseFieldSpec {
    key: string;
    required?: boolean;
}

export interface BaseSingularFieldSpec extends BaseFieldSpec {
    kind: SingularFieldKind;
}

export interface NumericSpec extends BaseSingularFieldSpec {
    kind: "numeric";
    normalize?: "standard" | "minmax" | "none";
    // filled during fit()
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    impute?: number;
}

export interface BooleanSpec extends BaseSingularFieldSpec {
    kind: "boolean";
}

export interface CategoricalSpec extends BaseSingularFieldSpec {
    kind: "categorical";
    vocab?: string[];           // optional: if absent, fit() builds it
    maxVocab?: number;          // optional cap
    // oovBucket?: number;         // number of OOV hash buckets Right now, we do not support any out of value buckets, unknown values should never be encountered
    hashing?: boolean;          // use hashing trick (ignores vocab)
}

export interface MultiCategoricalSpec extends BaseSingularFieldSpec {
    kind: "multi_categorical";
    vocab?: string[];
    maxVocab?: number;
    hashing?: boolean;
}
// We don't support text features for now.
// export interface TextSpec extends BaseSingularFieldSpec {
//     kind: "text";
//     // Choose one:
//     mode: "bag_of_words" | "hashing" | "use_embed"; // USE = Universal Sentence Encoder
//     vocab?: string[];           // for BoW
//     maxVocab?: number;
//     numHashBuckets?: number;    // for hashing
//     hashing?: boolean;
// }
// Spec for a model property that is a list of items of a given type.
// When encoded, the list is flattened.
export interface ListSpec extends BaseFieldSpec {
    kind: "list";
    contains: FieldKind;
    length: number;
}

export interface DictSpec extends BaseFieldSpec {
    kind: "dict";
    fields: FieldSpec[];
}

// export type FieldSpec = NumericSpec | BooleanSpec | CategoricalSpec | MultiCategoricalSpec | TextSpec | ListSpec;
export type FieldSpec = NumericSpec | BooleanSpec | CategoricalSpec | MultiCategoricalSpec | ListSpec | DictSpec;

export interface FeatureSpec {
    fields: FieldSpec[]

    // How to aggregate variable-length sets of objects:
    setEncoding?: "pad" | "mean" | "sum" | "max"; // default "pad"
    maxObjects?: number;        // required if setEncoding="pad"
}

export type TransformationSpec = FeatureSpec | FieldSpec;
