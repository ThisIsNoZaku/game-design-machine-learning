import {
    Agents,
    GameDefinition,
    GameDefinitionMetadata
} from "../src/definitions/BaseGameDefinition";
import {Region} from "../src/definitions/Region";
import {ActionDefinition} from "../src/definitions/ActionDefinition";
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
            regions: Object.fromEntries(Object.entries(this.locations).map(([id, location]) => [id, {
                ...location,
                state: {
                    value: 0
                }
            }])),
            terminated: false,
            winners: []
        }
    }

    get actions(): Array<ActionDefinition> {
        return [
            {
                id: "mark",
                parameters: {
                    "location" : "string"
                },
                execute: (game, state, parameters) => {
                    const locationId = parameters["location"] as string;
                    const actorId = state.players.active;

                    const region = state.regions[locationId];
                    if (!region) {
                        throw new Error(`Location '${locationId}' does not exist`);
                    }
                    if (region.state["value"]) {
                        throw new Error(`Location '${locationId}' is already marked`);
                    }

                    region.state["value"] = parseInt(actorId);

                    const winLines = [
                        ["0_0", "0_1", "0_2"],
                        ["1_0", "1_1", "1_2"],
                        ["2_0", "2_1", "2_2"],
                        ["0_0", "1_0", "2_0"],
                        ["0_1", "1_1", "2_1"],
                        ["0_2", "1_2", "2_2"],
                        ["0_0", "1_1", "2_2"],
                        ["0_2", "1_1", "2_0"],
                    ];

                    const playerValue = parseInt(actorId);
                    const hasWon = winLines.some(line =>
                        line.every(id => state.regions[id]?.state["value"] === playerValue)
                    );

                    if (hasWon) {
                        state.terminated = true;
                        state.winners = [state.players.active];
                        return;
                    }

                    const cellIds = ["0_0", "0_1", "0_2", "1_0", "1_1", "1_2", "2_0", "2_1", "2_2"];
                    const isDraw = cellIds.every(id => state.regions[id]?.state["value"] !== 0);
                    if (isDraw) {
                        state.terminated = true;
                        state.winners = [];
                        return;
                    }

                    state.players.active = actorId === "1" ? "2" : "1";
                }
            }
        ];
    }

}