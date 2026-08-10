import {GameState} from "../../src/state";
import {pick_regions} from "../../src/execution/pick";

describe("picking game state element", () => {
    describe("location picking", () => {
        let state:Pick<GameState, "regions">;
        beforeEach(() => {
            state = {
                regions: {
                    "A" : {
                        id: "A",
                    },
                    "B" : {
                        id: "B",
                    },
                    "C": {
                        id: "C",
                    }
                }
            };
        })
        it("returns all locations by default", () => {
            expect(pick_regions(state.regions)).toEqual([
                { id: "A" },
                { id: "B" },
                { id: "C" }
            ]);
        })
    })
})