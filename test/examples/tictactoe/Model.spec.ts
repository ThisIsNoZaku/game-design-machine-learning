import {BaseGameDefinition} from "../../../src/definitions/BaseGameDefinition";
import tictactoe from "../../../examples/tictactoe.schema.json";
import {GameState} from "../../../src/state/GameState";

describe("Tictactoe Model", () => {
    let game: BaseGameDefinition;
    let state: GameState;
    beforeAll(() => {
        [game, state] = BaseGameDefinition.GenerateFromDefinition(tictactoe);
    })
    it("generates an empty board", () => {
        expect(Object.values(state.regions)).toEqual([
            {
                id: "play_area",
                contains: ["board"]
            },
            {
                id: "board",
                contains: [
                    "board_0_0",
                    "board_0_1",
                    "board_0_2",
                    "board_1_0",
                    "board_1_1",
                    "board_1_2",
                    "board_2_0",
                    "board_2_1",
                    "board_2_2"
                ]
            },
            {
                id: "board_0_0",
                contains: []
            },
            {
                id: "board_0_1",
                contains: []
            },
            {
                id: "board_0_2",
                contains: []
            },
            {
                id: "board_1_0",
                contains: []
            },
            {
                id: "board_1_1",
                contains: []
            },
            {
                id: "board_1_2",
                contains: []
            },
            {
                id: "board_2_0",
                contains: []
            },
            {
                id: "board_2_1",
                contains: []
            },
            {
                id: "board_2_2",
                contains: []
            }
        ]);
    });
    it("generates two players", () => {
        expect(Object.values(state.players)).toEqual([
            {
                id: 1,
            },
            {
                id: 2,
            }
        ]);
    });
});