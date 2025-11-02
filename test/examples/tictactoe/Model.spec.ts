import {Game} from "../../../src/model/Game";
import tictactoe from "../../../examples/tictactoe.schema.json";

describe("Tictactoe Model", () => {
    it("generates an empty board", () => {
        const [game, state] = Game.GenerateFromDefinition(tictactoe);
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
                id: "board_0_0"
            },
            {
                id: "board_0_1"
            },
            {
                id: "board_0_2"
            },
            {
                id: "board_1_0"
            },
            {
                id: "board_1_1"
            },
            {
                id: "board_1_2"
            },
            {
                id: "board_2_0"
            },
            {
                id: "board_2_1"
            },
            {
                id: "board_2_2"
            }
        ]);
    });
});