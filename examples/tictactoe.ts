import {GameDescriptionExpansion} from "../src/expansion";
import {
    Agents,
    BaseGameDefinition,
    GameDefinition,
    GameDefinitionMetadata
} from "../src/definitions/BaseGameDefinition";
import {Region} from "../src/definitions/Region";
import {ActionDefinition} from "../src/definitions/ActionDefinition";
import metadata from "ajv/lib/vocabularies/jtd/metadata";
import {GameState} from "../src/state";

export class Tictactoe implements GameDefinition {
    readonly agents: Agents;
    readonly locations: { [p: string]: Region };
    readonly metadata: GameDefinitionMetadata;
    readonly parameters: Record<string, string | number | boolean>;

    constructor() {
        this.metadata = {
            id: "tictactoe",
            name: "Tic Tac Toe",
            version: 1
        }
        this.agents = {
            exactly: 2
        };
        this.locations = {
            playArea: {
                id: "play",
                contains: ["0_0", "0_1", "0_2", "1_0", "1_1", "1_2", "2_0", "2_1", "2_2"]
            },
            "0_0" : {
                id: "0_0",
                contains: []
            },
            "0_1" : {
                id: "0_1",
                contains: []
            },
            "0_2" : {
                id: "0_2",
                contains: []
            },
            "1_0" : {
                id: "1_0",
                contains: []
            },
            "1_1" : {
                id: "1_1",
                contains: []
            },
            "1_2" : {
                id: "1_2",
                contains: []
            },
            "2_0" : {
                id: "2_0",
                contains: []
            },
            "2_1" : {
                id: "2_1",
                contains: []
            },
            "2_2" : {
                id: "2_2",
                contains: []
            }
        };
        this.parameters = {};
    }

    getInitialState(): GameState {
        return {
            players: {
                "1": {
                    id: "1"
                },
                "2": {
                    id: "2"
                },
                active: "1"
            },
            entities: {},
            regions: {},
            terminated: false
        }
    }

    get actions(): Array<ActionDefinition> {
        return undefined;
    }

}