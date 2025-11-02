import {Action} from "./Action";
import {GameState} from "../state/GameState";
import {Region, ShapeRegion} from "./Region";
import {FeatureSpec} from "../specification/ModelSpecs";
import SpecProvider from "../specification/SpecProvider";
import {game} from "../json/schemas";
import {platform} from "node:os";

class Metadata {
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

/**
 * A stateless definition of a game ruleset.
 *
 * The Game can perform two actions: it can be given a state and queried for what Actions are allowed to be taken and by whom.
 *
 * It can then be given a state and an action, and return the new game state as a result of that action.
 */
export class Game implements SpecProvider {
    actions: Array<Action>;
    metadata: Metadata;
    parameters: Record<string, string | number | boolean>;
    agents: Agents;
    locations: { [id: string]: Region };

    private constructor(metadata: Metadata,
                        parameters: Record<string, string | number | boolean>,
                        actions: Array<Action>,
                        agents: Agents,
                        locations: { [id: string]: Region }) {
        if (!locations) {
            throw new Error("Empty locations array not allowed!");
        }
        this.metadata = metadata;
        this.parameters = parameters;
        this.actions = actions;
        this.agents = agents;

        const locationsMap: { [id: string]: Region } = {};

        const playArea: Region = locationsMap["play_area"] = {
            id: "play_area",
            contains: []
        };
        for (const id in locations) {
            const location = locations[id];
            if (location.shape) {
                const shapeRegion = new ShapeRegion(id, location.shape);
                locationsMap[id] = shapeRegion;
                for (const subregion of shapeRegion.subregions) {
                    locationsMap[subregion.id] = {
                        id: subregion.id,
                        contains: subregion.contains
                    }
                }
            } else {
                locationsMap[id] = {
                    id: id,
                    contains: location.contains
                };
            }
            playArea.contains.push(id);
        }

        this.locations = locationsMap;
    }

    getAllowedActions(state: any): any[] {
        // Generate variations of all possible actions.
        return this.actions;
    }

    // TypeScript
// Add this method to `src/rules/Game.ts` inside class Game
    spec(): Promise<FeatureSpec> {
        const fields: FeatureSpec['fields'] = [];

        fields.push({
            key: "activePlayer",
            kind: "numeric"
        });

        // agents -> expose min/max/exactly as numeric where present
        if (this.agents) {
            let maxPlayerCount = 0;
            if (typeof this.agents.exactly === 'number') {
                maxPlayerCount = this.agents.exactly;
            } else if (typeof this.agents.max === 'number' && typeof this.agents.min === 'number') {
                maxPlayerCount = this.agents.max;
            } else {
                throw new Error("Need exactly or min/max number of agents.")
            }
            // TODO: Use shape to define player state
            fields.push({key: 'players', kind: 'list', length: maxPlayerCount, contains: "dict", shape: []});
        }

        // locations -> categorical vocab of location ids
        const locIds = Object.keys(this.locations ?? {});
        if (locIds.length > 0) {
            // TODO: Use shape to define location state
            fields.push({
                key: 'locations', kind: 'list', length: locIds.length, contains: "dict", shape: [
                    {
                        key: "id",
                        kind: "numeric"
                    }
                ]
            });
        }

        // actions -> categorical vocab derived from action identifiers/names
        const actionLabels = (this.actions ?? []).map(a => (a as any).id ?? (a as any).name ?? JSON.stringify(a));
        const uniqActions = Array.from(new Set(actionLabels));
        if (uniqActions.length > 0) {
            fields.push({key: 'action', kind: 'categorical', vocab: uniqActions});
        }

        // use pooled encoding to avoid requiring maxObjects
        const spec: FeatureSpec = {fields, setEncoding: "pad"};
        return Promise.resolve(spec);
    }


    static GenerateFromDefinition(definition: any): [Game, GameState] {
        const game = new Game(definition.metadata, definition.parameters, definition.actions, definition.agents, definition.locations);
        return [
            game,
            GameState.generateInitialState(game, definition.initial)
        ];
    }
}