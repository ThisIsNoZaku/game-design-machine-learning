import {ActionDefinition} from "./ActionDefinition";
import {ConcreteGameState, GameState} from "../state/GameState";
import {GenerateRegion, PLAY_AREA, RegionDefinition, RegionId} from "./RegionDefinition";
import {FeatureSpec} from "../specification/ModelSpecs";
import SpecProvider from "../specification/SpecProvider";

export class GameDefinitionMetadata {
    id: string;
    name: string;
    version: number;
    description?: string;
    tags?: string[];

    constructor(id: string, name: string, version: number, description: string, tags: string[]) {
        this.id = id;
        this.name = name;
        this.version = version;
        this.description = description;
        this.tags = tags;
    }
}

export interface Agents {
    min?: number;
    max?: number;
    exactly?: number;
}

export interface ResolvedActionSelection {
    action: ActionDefinition;
    parameters: Record<string, string | number | boolean | RegionId>;
}

export interface GameDefinition extends SpecProvider{
    readonly metadata: GameDefinitionMetadata;
    readonly parameters: Record<string, string | number | boolean>;
    readonly agents: Agents;
    readonly locations: { play_area: RegionDefinition, [p: string]: RegionDefinition };

    /**
     * Return the initial state of the game.
     */
    getInitialState(): GameState;

    get actions(): Array<ActionDefinition>;

    /**
     * Return a state observation for the given actor.
     * @param state
     * @param actorId
     */
    getObservation(state: GameState, actorId: string): GameState;

    /**
     * Translate a model prediction vector to a concrete action selection and parameters.
     */
    resolveActionSelection(state: GameState, prediction: number[]): ResolvedActionSelection;
}
/**
 * A stateless definition of a game ruleset.
 *
 * The Game can perform two actions: it can be given a state and queried for what Actions are allowed to be taken and by whom.
 *
 * It can then be given a state and an action, and return the new game state as a result of that action.
 */
export class BaseGameDefinition implements GameDefinition, SpecProvider {
    private readonly _actions: Array<ActionDefinition>;
    private readonly _metadata: GameDefinitionMetadata;
    private readonly _parameters: Record<string, string | number | boolean>;
    private readonly _agents: Agents;
    private readonly _locations: { play_area: RegionDefinition, [id: string]: RegionDefinition };


    get actions(): Array<ActionDefinition> {
        return this._actions;
    }

    get metadata(): GameDefinitionMetadata {
        return this._metadata;
    }

    get parameters(): Record<string, string | number | boolean> {
        return this._parameters;
    }

    get agents(): Agents {
        return this._agents;
    }

    get locations(): { play_area: RegionDefinition, [p: string]: RegionDefinition } {
        return this._locations;
    }

    private constructor(metadata: GameDefinitionMetadata,
                        parameters: Record<string, string | number | boolean>,
                        actions: Array<ActionDefinition>,
                        agents: Agents,
                        locations: { [id: string]: RegionDefinition }) {
        if (!locations) {
            throw new Error("Empty locations array not allowed!");
        }
        this._metadata = metadata;
        this._parameters = parameters;
        this._actions = actions;
        this._agents = agents;


        const locationsMap: { play_area: RegionDefinition, [id: string]: RegionDefinition } = {
            [PLAY_AREA]: {
                id: PLAY_AREA,
                contains: []
            }
        };
        const playArea = locationsMap[PLAY_AREA];
        const locationsToExpand:[string, RegionDefinition, boolean][] = Object.entries(locations)
            .map(([id, location]) => [id, location, true]);
        while(locationsToExpand.length > 0) {
            const [id, location, isTopLevel] = locationsToExpand.shift() as [string, RegionDefinition, boolean];
            const generatedRegion = GenerateRegion(id, location);
            locationsMap[id] = generatedRegion;
            if (isTopLevel) {
                playArea.contains.push(id);
            }
            for(let subregion of (generatedRegion.subregions || [])) {
                locationsToExpand.push([subregion.id, subregion, false]);
            }
        }

        this._locations = locationsMap;
    }

    getAllowedActions(state: any): any[] {
        // Generate variations of all possible actions.
        return this._actions;
    }

    resolveActionSelection(state: GameState, prediction: number[]): ResolvedActionSelection {
        void state;
        if (!Array.isArray(prediction) || prediction.length === 0) {
            throw new Error("Prediction must be a non-empty numeric array");
        }
        if (this._actions.length === 0) {
            throw new Error("Game definition does not define any actions");
        }

        const rawActionIndex = Number(prediction[0]);
        const safeActionIndex = Number.isFinite(rawActionIndex)
            ? Math.floor(Math.abs(rawActionIndex)) % this._actions.length
            : 0;
        const action = this._actions[safeActionIndex];

        if (!action.parameters || Object.keys(action.parameters).length === 0) {
            return {action, parameters: {}};
        }

        throw new Error(
            `Game '${this.metadata.id}' must override resolveActionSelection() for parameterized actions`
        );
    }

    // expandLocations(locations) {
    //
    // }

    spec(): Promise<FeatureSpec> {
        const fields: FeatureSpec['fields'] = [];

        fields.push({
            key: "activePlayer",
            kind: "numeric"
        });

        // agents -> expose min/max/exactly as numeric where present
        if (this._agents) {
            let maxPlayerCount = 0;
            if (typeof this._agents.exactly === 'number') {
                maxPlayerCount = this._agents.exactly;
            } else if (typeof this._agents.max === 'number' && typeof this._agents.min === 'number') {
                maxPlayerCount = this._agents.max;
            } else {
                throw new Error("Need exactly or min/max number of agents.")
            }
            // TODO: Use shape to define player state
            fields.push({key: 'players', kind: 'list', length: maxPlayerCount, contains: "dict", shape: []});
        }

        // locations -> encode all locations as dictionaries with id + value
        const locIds = Object.keys(this._locations ?? {});
        if (locIds.length > 0) {
            fields.push({
                key: 'locations', kind: 'list', length: locIds.length, contains: "dict", shape: [
                    {
                        key: "id",
                        kind: "numeric"
                    },
                    {
                        key: "value",
                        kind: "numeric"
                    }
                ]
            });
        }

        // actions -> include expected action id shape
        if ((this._actions ?? []).length > 0) {
            fields.push({
                key: "actions",
                kind: "dict",
                shape: [
                    {
                        key: "id",
                        kind: "numeric"
                    }
                ]
            });
        }

        // use pooled encoding to avoid requiring maxObjects
        const spec: FeatureSpec = {
            fields,
            setEncoding: "pad",
            encode(state: GameState): number[] {
                void state;
                throw new Error("BaseGameDefinition.spec().encode() must be implemented by a concrete game definition");
            }
        };
        return Promise.resolve(spec);
    }


    static GenerateFromDefinition(definition: GameDefinition): [GameDefinition, GameState] {
        if (!definition.actions) {
            throw new Error("Game definition must define actions");
        }
        if(!definition.getInitialState()) {
            throw new Error("Game definition must define getInitialState() to return a valid initial state");
        }
        return [
            definition,
            ConcreteGameState.generateInitialState(definition, definition.getInitialState())
        ];
    }
}