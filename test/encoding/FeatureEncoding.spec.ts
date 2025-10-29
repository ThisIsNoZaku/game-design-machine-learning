import {FeatureEncoder} from "../../src/encoding/FeatureEncoder";
import {FeatureSpec} from "../../src/specification/ModelSpecs";

describe("Feature encoder", () => {
    it("can encode numeric features", async () => {
        const spec: FeatureSpec = {
            fields: [
                {
                    kind: "numeric",
                    key: "value"
                }
            ],
            maxObjects: 3
        }
        const model = [{
            value: 1
        }, {
            value: 2
        }, {
            value: 3
        }];

        const encoder = new FeatureEncoder(spec);
        encoder.fit(model);

        expect(await encoder.transform(model).x.array()).toEqual([[1], [2], [3]]);
    });
    it("can encode numeric features with normalization", async () => {
        const spec: FeatureSpec = {
            fields: [
                {
                    kind: "numeric",
                    key: "value",
                    normalize: "minmax"
                }
            ],
            maxObjects: 3
        }
        const model = [{
            value: 1
        }, {
            value: 2
        }, {
            value: 3
        }];

        const encoder = new FeatureEncoder(spec);
        encoder.fit(model);

        expect(await encoder.transform(model).x.array()).toEqual([[0], [.5], [1]]);
    });
    it("can encode numeric features with standardization", async () => {
        const spec: FeatureSpec = {
            fields: [
                {
                    kind: "numeric",
                    key: "value",
                    normalize: "standard"
                }
            ],
            maxObjects: 3
        }
        const model = [{
            value: 1
        }, {
            value: 2
        }, {
            value: 3
        }];

        const encoder = new FeatureEncoder(spec);
        encoder.fit(model);

        expect(await encoder.transform(model).x.array()).toEqual([[-1.2247449159622192], [0], [1.2247449159622192]]);
    });
    it("can encode boolean features", async () => {
        const spec: FeatureSpec = {
            fields: [
                {
                    kind: "boolean",
                    key: "flag"
                }
            ],
            maxObjects: 3
        }

        const model = [{
            flag: true
        }, {
            flag: false
        }, {
            flag: true
        }];
        const encoder = new FeatureEncoder(spec);
        encoder.fit(model);

        expect(await encoder.transform(model).x.array()).toEqual([[1], [0], [1]]);
    });
    it("can encode categorical features", async () => {
        const spec : FeatureSpec = {
            fields: [
                {
                    kind: "categorical",
                    key: "color",
                    vocab: ["red", "green", "blue"]
                }
            ],
            maxObjects: 4
        };

        const model = [{
            color: "red"
        }, {
            color: "green"
        }, {
            color: "blue"
        }, {
            color: "green"
        }];

        const encoder = new FeatureEncoder(spec);
        encoder.fit(model);

        expect(await encoder.transform(model).x.array()).toEqual([[1,0,0], [0,1,0], [0,0,1], [0,1,0]]);
    });
    it("can encode multi-categorical features", async () => {
        const spec : FeatureSpec = {
            fields: [
                {
                    kind: "multi_categorical",
                    key: "tags",
                    vocab: ["red", "green", "blue"]
                }
            ],
            maxObjects: 4
        };

        const model = [{
            tags: ["red", "blue"]
        }, {
            tags: ["green"]
        }, {
            tags: ["blue", "green"]
        }, {
            tags: []
        }];

        const encoder = new FeatureEncoder(spec);
        encoder.fit(model);

        expect(await encoder.transform(model).x.array()).toEqual([[1,0,1], [0,1,0], [0,1,1], [0,0,0]]);
    });
    describe("list features", () => {
        it("flattens numeric lists", async () => {
            const spec: FeatureSpec = {
                fields: [
                    {
                        kind: "numeric",
                        key: "id"
                    },
                    {
                        kind: "list",
                        key: "values",
                        contains: "numeric",
                        length: 3
                    }],
                maxObjects: 1
            }

            const model = [{
                id: 1,
                values: [42, 13, 541]
            }];

            const encoder = new FeatureEncoder(spec);
            encoder.fit(model);

            expect(await encoder.transform(model).x.array()).toEqual([[1, 42, 13, 541]]);
        });
        it("flattens boolean lists", async () => {
            const spec: FeatureSpec = {
                fields: [
                    {
                        kind: "categorical",
                        key: "handed",
                        vocab: ["left", "right", "neither", "both"]
                    },
                    {
                        kind: "list",
                        key: "values",
                        contains: "boolean",
                        length: 3
                    }],
                maxObjects: 2
            }

            const model = [{
                handed: "right",
                values: [true, false, true]
            }, {
                handed: "left",
                values: [false, false, true]
            }];

            const encoder = new FeatureEncoder(spec);
            encoder.fit(model);

            expect(await encoder.transform(model).x.array()).toEqual([
                [0, 1, 0, 0, 1, 0, 1],
                [1, 0, 0, 0, 0, 0, 1]
            ]);
        })
    });
});