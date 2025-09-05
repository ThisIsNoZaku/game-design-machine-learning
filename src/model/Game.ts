import { Model } from "./Action";

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

/**
 * A stateless definition of a game ruleset.
 *
 * The Game can perform two actions: it can be given a state and queried for what Actions are allowed to be taken and by whom.
 *
 * It can then be given a state and an action, and return an array of changes to the game state that occurred as a result of the action.
 */
export class Game {
    actions:Array<Model.Action>;
    metadata: Metadata;
    parameters: Record<string, string | number | boolean>;

    private constructor(metadata: Metadata, parameters: Record<string, string | number | boolean>, actions: Array<Model.Action>) {
        this.metadata = metadata;
        this.parameters = parameters;
        this.actions = actions;
    }

    getAllowedActions(state: any): any[] {
        // Generate variations of all possible actions.
        return this.actions;
    }

    performAction(state: any, action: any): any[] {
        return [];
    }

    static GenerateFromDefinition(definition: any): [Game, GameState?] {
        return [new Game(definition.metadata, definition.parameters, definition.actions)];
    }
}