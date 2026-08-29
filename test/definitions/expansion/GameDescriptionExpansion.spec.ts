import {GameDescriptionExpansion} from "../../../src/expansion";
import {BoardMLGameSpecTopLevelDescription} from "../../../src/descriptions/GameDescription";

describe("Game Description Expansion", () => {
    it("expands into a game definition", () => {
        const description: BoardMLGameSpecTopLevelDescription = {
            metadata: {
                id: "test-game",
                name: "Test Game",
                version: 1
            },
            parameters: {
                rounds: 3
            },
            agents: {
                exactly: 2
            },
            locations: {
                board: {
                    shape: {
                        rows: 2,
                        cols: 2,
                        state: {
                            occupied: false
                        }
                    }
                },
                discard: {
                    links: ["board"]
                }
            },
            actions: [
                {
                    id: "mark"
                }
            ],
            rules: {}
        };

        const gameDefinition = new GameDescriptionExpansion().transform(description);

        expect(gameDefinition.metadata).toEqual(expect.objectContaining({
            id: "test-game",
            name: "Test Game",
            version: 1
        }));
        expect(gameDefinition.parameters).toEqual({
            rounds: 3
        });
        expect(gameDefinition.actions).toHaveLength(1);
        expect(gameDefinition.actions[0]).toEqual(expect.objectContaining({
            id: "mark",
            actor: "agent",
            parameters: {}
        }));
        expect(gameDefinition.locations.board.contains).toEqual([
            "board_0_0",
            "board_0_1",
            "board_1_0",
            "board_1_1"
        ]);
        expect(gameDefinition.locations.board.shape).toEqual({
            rows: 2,
            cols: 2,
            state: {
                occupied: false
            }
        });
        expect(gameDefinition.locations.discard.shape).toEqual({
            rows: 0,
            cols: 0,
            state: {}
        });
    });

    it("uses metadata id as name and defaults optional values", () => {
        const description: BoardMLGameSpecTopLevelDescription = {
            metadata: {
                id: "fallback-name-game",
                version: 1
            },
            agents: {
                exactly: 1
            },
            locations: {
                zone: {
                    shape: {
                        rows: 1,
                        cols: 2
                    }
                }
            },
            actions: [
                {
                    id: "wait"
                }
            ],
            rules: {}
        };

        const gameDefinition = new GameDescriptionExpansion().transform(description);

        expect(gameDefinition.metadata.name).toBe("fallback-name-game");
        expect(gameDefinition.parameters).toEqual({});
        expect(gameDefinition.locations.zone.shape).toEqual({
            rows: 1,
            cols: 2,
            state: {}
        });
    });
})