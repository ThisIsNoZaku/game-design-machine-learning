import {Tictactoe} from "../../../examples/tictactoe";
import {BaseGameDefinition} from "../../../src/definitions/BaseGameDefinition";
import act from "../../../src/execution/act";
import {pick_random, pick_regions} from "../../../src/execution/pick";

describe("Complete tictactoe end-to-end", () => {
    it("ends when a line is created", () => {
        const [game, state] = BaseGameDefinition.GenerateFromDefinition(new Tictactoe());
        let loops = 0;
        while (!state.terminated) {
            loops++;
            if (loops > 9) {
                throw new Error("Game did not terminate after 9 moves");
            }
            // TODO: Mark a random space
            act(game, state,
                game.actions[0], {
                    actor: state.players.active,
                    location: pick_random(Object.values(state.regions).filter(r => {
                        return "value" in r.state && !r.state["value"];
                    }))[0].id
                });
            if(!state.terminated) {
                if (loops % 2 === 0) {
                    expect(state.players.active).toBe("1");
                } else {
                    expect(state.players.active).toBe("2");
                }
            }
        }

        expect(state.winners.includes("1") || state.winners.includes("2")).toBeTruthy();
        expect(state.winners.length).toBe(1);
    })
});