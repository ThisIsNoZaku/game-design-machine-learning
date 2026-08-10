import * as tictacttoe from "../../../examples/tictactoe.schema.json"
import {BoardMLGameSpecTopLevelDescription} from "../../../src/descriptions/GameDescription";

describe("TicTacToe Descriptions", () => {
    it("describes 2 agents", () => {
        const expectedDescription: Pick<BoardMLGameSpecTopLevelDescription, "agents"> = {
            agents: {
                exactly: 2
            }
        };
        expect(tictacttoe).toMatchObject(expectedDescription);
    });
    it("describes a 3x3 board with one property", () => {
        const expectedDescription: Pick<BoardMLGameSpecTopLevelDescription, "locations"> = {
            locations: {
                board: {
                    shape: {
                        rows: 3,
                        cols: 3,
                        state: {
                            value: {
                                type: "integer",
                                min: 0,
                                max: 2
                            }
                        }
                    }
                }
            }
        };
        expect(tictacttoe).toMatchObject(expectedDescription);
    });
    it("describes an action to mark one empty space", () => {
        const expectedDescription: Pick<BoardMLGameSpecTopLevelDescription, "actions"> = {
            actions: [
                {
                    id: "mark",
                    label: "Mark",
                    parameters:
                        {
                            location: {
                                location: {
                                    filters: [
                                        {
                                            expr: "value == 0"
                                        },
                                    ]
                                }
                            }
                        }
                }
            ]
        }
    })
})