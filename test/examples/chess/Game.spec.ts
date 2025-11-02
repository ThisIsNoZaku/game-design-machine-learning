import chess from "../../../examples/chess.schema.json";
import {RuleDocumentValidator} from "../../../src/json/RuleDocumentValidator";
import {Game} from "../../../src/rules/Game";
import {Agent} from "../../../src/rules/Agent";

namespace Chess {
    describe("Chess instance", () => {
        let gameModel: Game;
        let gameState: any;
        beforeEach(() => {
            const parsed: any = new RuleDocumentValidator().validate(chess);
            [gameModel, gameState] = Game.GenerateFromDefinition(parsed);
        })
        it("returns player 1 as first actor at the start of the game", () => {
            const player1 = new Agent("1");
            const allowedActions = gameModel.getAllowedActions(gameState);
            expect(allowedActions.length).toBe(1);
        });
    });
}