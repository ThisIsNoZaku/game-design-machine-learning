import checkers from "../../../examples/tictactoe.schema.json";
import {RuleDocumentValidator} from "../../../src/json/RuleDocumentValidator";
import {Game} from "../../../src/model/Game";

namespace Tictactoe {
    describe("Tictactoe Definition", () => {
        it("loads and validates the chess definition", () => {
            const output: any = new RuleDocumentValidator().validate(checkers);
            expect(output).toBeDefined();
            expect(output.metadata.id).toBe("tictactoe");
            expect(output.agents.count.min).toBe(2);
            expect(output.agents.count.max).toBe(2);
            expect(output.locations).toEqual([{
                id: "board",
                "shape": {
                    "cols" : 3,
                    "rows" : 3
                }
            }]);
            expect(output.rules).toBeDefined();
        });
    })
}