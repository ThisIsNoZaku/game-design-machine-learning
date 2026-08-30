import {BaseGameDefinition, GameDefinition} from "../../../src/definitions/BaseGameDefinition";
import tictactoe from "../../../examples/tictactoe.schema.json";
import {GameState} from "../../../src/state/GameState";
import {PLAY_AREA} from "../../../src/definitions/RegionDefinition";

describe("Tictactoe Model", () => {
    let game: GameDefinition;
    let state: GameState;
    beforeAll(() => {
        [game, state] = BaseGameDefinition.GenerateFromDefinition(tictactoe);
    })
    test.skip("generates an empty board", () => {
        expect(Object.values(state.regions)).toEqual([
            {
                id: PLAY_AREA,
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
    test.skip("generates two players", () => {
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