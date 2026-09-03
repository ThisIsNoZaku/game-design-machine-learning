import {ActionDefinition} from "../../../src/definitions/ActionDefinition";
import {
    GameDefinition,
    GameDefinitionMetadata,
    ResolvedActionSelection
} from "../../../src/definitions/BaseGameDefinition";
import {PLAY_AREA, RegionId} from "../../../src/definitions/RegionDefinition";
import {FeatureSpec} from "../../../src/specification/ModelSpecs";
import {GameRegions, GameState} from "../../../src/state/GameState";
import {RegionInstance} from "../../../src/state/RegionInstance";
import {select} from "../../../src/execution/selection";

type NamedAction = ActionDefinition & { name: string };

function createGameState(): GameState {
    const regions: GameRegions = {
        playArea: {
            id: PLAY_AREA,
            contains: ["bench"],
            state: {},
            tags: new Set(["root"]),
            name: "Play Area"
        } as RegionInstance & { id: "play_area" },
        bench: {
            id: "bench",
            contains: [],
            state: {occupied: true},
            tags: new Set(["side", "zone"]),
            name: "Bench"
        } as RegionInstance & { name: string }
    };

    return {
        winners: [],
        terminated: false,
        players: {
            active: "1",
            "1": {id: "1", team: "A"},
            "2": {id: "2", team: "B"}
        },
        entities: {
            1: {id: "e1", name: "Soldier", kind: "soldier", hp: 2, tags: ["unit", "frontline"]},
            2: {id: "e2", name: "Rookie", kind: "soldier", hp: 0, tags: ["unit"]},
            3: {id: "e3", name: "Scout", kind: "medic", hp: 1, tags: new Set(["support", "unit"])}
        },
        regions
    };
}

function createGameDefinition(state: GameState): GameDefinition {
    const actions: NamedAction[] = [
        {
            id: "move",
            name: "Move",
            tags: ["core", "movement"],
            execute(): void {
                return;
            }
        },
        {
            id: "pass",
            name: "Pass",
            tags: ["core"],
            execute(): void {
                return;
            }
        }
    ];

    const featureSpec: FeatureSpec = {
        fields: [],
        encode(): number[] {
            return [];
        }
    };

    return {
        metadata: new GameDefinitionMetadata("test", "Test Game", 1, "", []),
        parameters: {},
        agents: {exactly: 2},
        locations: {
            play_area: {id: PLAY_AREA, contains: ["bench"]},
            bench: {id: "bench", contains: []}
        },
        getInitialState(): GameState {
            return state;
        },
        get actions(): ActionDefinition[] {
            return actions;
        },
        getObservation(currentState: GameState): GameState {
            return currentState;
        },
        resolveActionSelection(): ResolvedActionSelection {
            return {action: actions[0], parameters: {} as Record<string, string | number | boolean | RegionId>};
        },
        spec(): Promise<FeatureSpec> {
            return Promise.resolve(featureSpec);
        }
    };
}

describe("Fluent selection", () => {
    describe("of entities", () => {
        it("selects and filters by id", () => {
            const state = createGameState();
            const definition = createGameDefinition(state);

            const selected = select()
                .in(state, definition)
                .fromEntities()
                .whereId(["e1", "e3"])
                .whereName("Scout")
                .hasTag("support")
                .toArray();

            expect((selected as Array<{ id: string }>).map((entity) => entity.id)).toEqual(["e3"]);
        });
    });

    it("selects regions and filters by id, name and tags", () => {
        const state = createGameState();
        const definition = createGameDefinition(state);

        const generator = select()
            .in(state, definition)
            .fromRegions()
            .whereId("bench")
            .whereName("Bench")
            .hasTag(["zone", "missing"])
            .toGenerator();

        expect(Array.from(generator).map((region) => region.id)).toEqual(["bench"]);
    });

    it("selects actions and filters by id, name and tags", () => {
        const state = createGameState();
        const definition = createGameDefinition(state);

        const actions = select()
            .in(state, definition)
            .fromActions()
            .whereId("move")
            .whereName("Move")
            .hasTag("core")
            .toArray();

        expect(actions.map((action) => action.id)).toEqual(["move"]);
    });

    it("keeps custom where() composable with built-in filters", () => {
        const state = createGameState();
        const definition = createGameDefinition(state);

        const selected = select()
            .in(state, definition)
            .fromEntities()
            .hasTag("unit")
            .where((entity) => Number((entity as { hp?: number }).hp) > 0)
            .toArray();

        expect((selected as Array<{ id: string }>).map((entity) => entity.id)).toEqual(["e1", "e3"]);
    });
});
