import chess from "../../../examples/chess.schema.json";
import {RuleDocumentValidator} from "../../../src/json/RuleDocumentValidator";
import {BaseGameDefinition} from "../../../src/definitions/BaseGameDefinition";
import {AgentDefinition} from "../../../src/definitions/AgentDefinition";

namespace Chess {
    describe("Chess instance", () => {
        let gameModel: BaseGameDefinition;
        let gameState: any;
        beforeEach(() => {
            const parsed: any = new RuleDocumentValidator().validate(chess);
            [gameModel, gameState] = BaseGameDefinition.GenerateFromDefinition(parsed);
        })
        it("returns player 1 as first actor at the start of the game", () => {
            const player1 = new AgentDefinition("1");
            const allowedActions = gameModel.getAllowedActions(gameState);
            expect(allowedActions.length).toBe(1);
        });
    });
}