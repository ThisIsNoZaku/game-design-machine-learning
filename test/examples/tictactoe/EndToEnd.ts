import tictactoe from "../../../examples/tictactoe.schema.json";
import {Game} from "../../../src/rules/Game";
import {RuleDocumentValidator} from "../../../src/json/RuleDocumentValidator";
import {FeatureEncoder} from "../../../src/encoding/FeatureEncoder";
import {FeatureSpec} from "../../../src/specification/ModelSpecs";

describe("Complete tictactoe end-to-end", () => {
    const expectedValidatedDefinition = {
        metadata: {
            id: "tictactoe"
        },
        agents: {
            exactly: 2
        },
        locations: {
            board: {
                shape: {
                    cols: 3,
                    rows: 3
                },
                state: {
                    value: {
                        type: "integer",
                        min: 0,
                        max: 2
                    }
                }
            }
        },
        actions: [
            {
                id: "mark",
                parameters: {
                    location: {
                        location: {
                            where: "value === 0"
                        }
                    }
                }
            }
        ],
        rules: {}
    };
    const expectedGameSpec: FeatureSpec = {
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
    };

    const expectedEncoded = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];

    it("gets a game ready to play", async () => {
        const validated = new RuleDocumentValidator().validate(tictactoe);
        expect(validated).toEqual(expectedValidatedDefinition);

        const [game, state] = Game.GenerateFromDefinition(validated);
        const actualSpec = await game.spec();
        expect(expectedGameSpec).toEqual(actualSpec)

        const encoded = new FeatureEncoder(actualSpec);
        expect(expectedEncoded).toEqual(encoded);
    });
});