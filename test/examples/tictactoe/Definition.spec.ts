import tictactoe from "../../../examples/tictactoe.schema.json";
import {RuleDocumentValidator} from "../../../src/json/RuleDocumentValidator";
import {BaseGameDefinition} from "../../../src/definitions/BaseGameDefinition";

describe("Tictactoe Definition", () => {
    it("loads and validates the definition", () => {
        const output: any = new RuleDocumentValidator().validate(tictactoe);
        expect(output).toBeDefined();
        expect(output.metadata.id).toBe("tictactoe");
        expect(output.agents).toEqual({
            exactly: 2
        });
        expect(output.locations).toEqual({
            "board": {
                "shape": {
                    "cols": 3,
                    "rows": 3,
                    "state": {
                        "value": {
                            "type": "integer",
                            "min": 0,
                            "max": 2
                        }
                    }
                }
            }
        });
        expect(output.actions).toEqual([
            {
                id: "mark",
                parameters: {
                    location: {
                        location: {
                            where: "value === 0"
                        }
                    }
                }
            }
        ]);
        expect(output.rules).toBeDefined();
    });
})