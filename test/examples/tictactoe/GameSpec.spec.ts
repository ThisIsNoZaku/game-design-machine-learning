import tictactoe from "../../../examples/tictactoe.schema.json";
import {FeatureSpec} from "../../../src/specification/ModelSpecs";
import {Game} from "../../../src/rules/Game";

describe("Tictactoe spec", () => {
    it("defines the specification for encoding", async () => {
        const [game] = Game.GenerateFromDefinition(tictactoe);
        expect(await game.spec()).toEqual({
            fields: [
                {
                    key: "activePlayer",
                    kind: "numeric"
                },
                {
                    key: "players",
                    kind: "list",
                    length: 2,
                    contains: "dict",
                    shape: []
                },
                {
                    key: "locations",
                    kind: "list",
                    contains: "dict",
                    length: 11,
                    shape: [
                        {
                            key: "id",
                            kind: "numeric",
                        },
                        {
                            key: "value",
                            kind: "numeric"
                        }],
                },
                {
                    key: "actions",
                    kind: "dict",
                    shape: [
                        {
                            key: "id",
                            kind: "numeric"
                        }
                    ]
                }
            ]
        } as FeatureSpec);
    });
})