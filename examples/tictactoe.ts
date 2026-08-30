import {
    Agents,
    GameDefinition,
    GameDefinitionMetadata,
    ResolvedActionSelection
} from "../src/definitions/BaseGameDefinition";
import {PLAY_AREA, RegionDefinition} from "../src/definitions/RegionDefinition";
import {ActionDefinition} from "../src/definitions/ActionDefinition";
import {GameState} from "../src/state";
import SpecProvider from "../src/specification/SpecProvider";
import { FeatureSpec } from "../src/specification/ModelSpecs";

export class Tictactoe implements GameDefinition, SpecProvider {
    readonly agents: Agents;
    readonly locations: { [p: string]: RegionDefinition };
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
            play_area: {
                id: PLAY_AREA,
                contains: ["0_0", "0_1", "0_2", "1_0", "1_1", "1_2", "2_0", "2_1", "2_2"]
            },
            "0_0": {
                id: "0_0",
                contains: []
            },
            "0_1": {
                id: "0_1",
                contains: []
            },
            "0_2": {
                id: "0_2",
                contains: []
            },
            "1_0": {
                id: "1_0",
                contains: []
            },
            "1_1": {
                id: "1_1",
                contains: []
            },
            "1_2": {
                id: "1_2",
                contains: []
            },
            "2_0": {
                id: "2_0",
                contains: []
            },
            "2_1": {
                id: "2_1",
                contains: []
            },
            "2_2": {
                id: "2_2",
                contains: []
            }
        };
        this.parameters = {};
    }

    spec(): Promise<FeatureSpec> {
        return Promise.resolve({
            fields: [],
            encode(state:GameState): number[] {
                const cellIds = ["0_0", "0_1", "0_2", "1_0", "1_1", "1_2", "2_0", "2_1", "2_2"];
                return cellIds.map(id => {
                    const region = state.regions[id];
                    if (!region) {
                        throw new Error(`Region '${id}' does not exist in the game state`);
                    }
                    const value = region.state["value"];
                    if (typeof value !== "number") {
                        throw new Error(`Region '${id}' has an invalid value in the game state`);
                    }
                    return value;
                });
            }
        });
    }

    getObservation(state: GameState, actorId: string): GameState {
        void actorId;

        const observedRegions = Object.fromEntries(
            Object.entries(state.regions).map(([regionId, region]) => {
                const regionState = region.state ?? {};
                const value = typeof regionState["value"] === "number" ? regionState["value"] : 0;

                return [regionId, {
                    ...region,
                    state: {
                        ...regionState,
                        value: value * -1
                    }
                }];
            })
        ) as Record<string, (typeof state.regions)[string]>;
        const playArea = observedRegions[PLAY_AREA];
        if (!playArea) {
            throw new Error("Observation is missing required playArea region");
        }

        return  {
            ...state,
            regions: {
                ...observedRegions,
                playArea
            }
        };
    }

    resolveActionSelection(state: GameState, prediction: number[]): ResolvedActionSelection {
        if (!Array.isArray(prediction) || prediction.length === 0) {
            throw new Error("Prediction must contain at least an action id");
        }

        const actions = this.actions;
        if (actions.length === 0) {
            throw new Error("No actions are available for tictactoe");
        }

        const toIndex = (rawValue: number, size: number): number => {
            if (size <= 0) {
                throw new Error("Cannot select from an empty option set");
            }
            if (!Number.isFinite(rawValue)) {
                return 0;
            }
            return Math.floor(Math.abs(rawValue)) % size;
        };

        const selectedAction = actions[toIndex(Number(prediction[0]), actions.length)];
        const availableLocations = ["0_0", "0_1", "0_2", "1_0", "1_1", "1_2", "2_0", "2_1", "2_2"]
            .filter(regionId => state.regions[regionId]?.state["value"] === 0);
        if (availableLocations.length === 0) {
            throw new Error("No legal locations remain to map prediction output");
        }

        const locationSelection = availableLocations[toIndex(Number(prediction[1] ?? 0), availableLocations.length)];
        return {
            action: selectedAction,
            parameters: {
                location: locationSelection
            }
        };
    }

    getInitialState(): GameState {
        const initialRegions = Object.fromEntries(Object.entries(this.locations).map(([id, location]) => [id, {
            ...location,
            state: {
                value: 0
            }
        }])) as Record<string, GameState["regions"][string]>;
        const playArea = initialRegions[PLAY_AREA];
        if (!playArea) {
            throw new Error("Initial state is missing required play_area region");
        }

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
            regions: {
                ...initialRegions,
                playArea
            },
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

                    // 1 == me, -1 is the opponent.
                    region.state["value"] = 1;

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