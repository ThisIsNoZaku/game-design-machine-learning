import chess from "../../../examples/chess.schema.json";
import {RuleDocumentValidator} from "../../../src/json/RuleDocumentValidator";

describe("Chess Definition", () => {
    it("loads and validates the chess definition", () => {
        const output: any = new RuleDocumentValidator().validate(chess);
        expect(output).toBeDefined();
        expect(output.metadata.id).toBe("chess");
        expect(output.agents.count.min).toBe(2);
        expect(output.agents.count.max).toBe(2);
        expect(output.locations).toBeDefined();
        expect(output.initial.entities).toEqual({
            1: {kind: "rook", controller: 1, location: "a1"},
            2: {kind: "knight", controller: 1, location: "b1"},
            3: {kind: "bishop", controller: 1, location: "c1"},
            4: {kind: "queen", controller: 1, location: "d1"},
            5: {kind: "king", controller: 1, location: "e1"},
            6: {kind: "bishop", controller: 1, location: "f1"},
            7: {kind: "knight", controller: 1, location: "g1"},
            8: {kind: "rook", controller: 1, location: "h1"},
            9: {kind: "pawn", controller: 1, location: "a2"},
            10: {kind: "pawn", controller: 1, location: "b2"},
            11: {kind: "pawn", controller: 1, location: "c2"},
            12: {kind: "pawn", controller: 1, location: "d2"},
            13: {kind: "pawn", controller: 1, location: "e2"},
            14: {kind: "pawn", controller: 1, location: "f2"},
            15: {kind: "pawn", controller: 1, location: "g2"},
            16: {kind: "pawn", controller: 1, location: "h2"},
            17: {kind: "rook", controller: 2, location: "a8"},
            18: {kind: "knight", controller: 2, location: "b8"},
            19: {kind: "bishop", controller: 2, location: "c8"},
            20: {kind: "queen", controller: 2, location: "d8"},
            21: {kind: "king", controller: 2, location: "e8"},
            22: {kind: "bishop", controller: 2, location: "f8"},
            23: {kind: "knight", controller: 2, location: "g8"},
            24: {kind: "rook", controller: 2, location: "h8"},
            25: {kind: "pawn", controller: 2, location: "a7"},
            26: {kind: "pawn", controller: 2, location: "b7"},
            27: {kind: "pawn", controller: 2, location: "c7"},
            28: {kind: "pawn", controller: 2, location: "d7"},
            29: {kind: "pawn", controller: 2, location: "e7"},
            30: {kind: "pawn", controller: 2, location: "f7"},
            31: {kind: "pawn", controller: 2, location: "g7"},
            32: {kind: "pawn", controller: 2, location: "h7"}
        });
        expect(output.rules).toBeDefined();
    });
})