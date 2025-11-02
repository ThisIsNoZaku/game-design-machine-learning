import {Action} from "./Action";
import {GameState} from "../state/GameState";
import Region from "./Region";

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
export class Game {
    actions: Array<Action>;
    metadata: Metadata;
    parameters: Record<string, string | number | boolean>;
    agents: Agents;
    locations: { [id: string]: Region };

    private constructor(metadata: Metadata,
                        parameters: Record<string, string | number | boolean>,
                        actions: Array<Action>,
                        agents: Agents,
                        locations: Array<Region>) {
        if(!locations) {
            throw new Error("Empty locations array not allowed!");
        }
        this.metadata = metadata;
        this.parameters = parameters;
        this.actions = actions;
        this.agents = agents;
        this.locations = locations.reduce((locations, l) => {
            return {...locations, [l.id]: l};
        }, {});
    }

    getAllowedActions(state: any): any[] {
        // Generate variations of all possible actions.
        return this.actions;
    }

    static GenerateFromDefinition(definition: any): [Game, GameState] {
        const game = new Game(definition.metadata, definition.parameters, definition.actions, definition.agents, definition.locations);
        return [
            game,
            GameState.generateInitialState(game, definition.initial)
        ];
    }
}