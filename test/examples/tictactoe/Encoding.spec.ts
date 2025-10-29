import {FeatureEncoder} from "../../../src/encoding/FeatureEncoder";
import {FeatureSpec} from "../../../src/specification/ModelSpecs";

describe("Tictactoe state transformation", () => {
    const state = {
        board: [
            0, 0, 0,
            0, 0, 0,
            0, 0, 0
        ]
    }
    const spec:FeatureSpec = {
        fields: [
            {
                "key": "board",
                "kind" : "list",
                "contains" : "numeric",
                "length": 9
            }
        ],
        setEncoding: "pad",
        maxObjects: 1
    }
    it("transforms the state of the board", () => {
        const encoder = new FeatureEncoder(spec);
        expect(encoder.transformState(state).x.arraySync()).toEqual([[0, 0, 0, 0, 0, 0, 0, 0, 0]]);
    });
});