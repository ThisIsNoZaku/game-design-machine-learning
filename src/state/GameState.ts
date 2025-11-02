import {ThingState} from "./State";
import {Game} from "../rules/Game";
import {Region, RegionInstance} from "../rules/Region";

/**
 * Defines the state of the game, including player, entities and environment properties.
 */
export class GameState {
    players: { [id: number]: ThingState };
    private entities: { [id: number]: ThingState };
    regions: { [id: string]: RegionInstance };

    constructor(agents: {
                    [p: number]:
                        ThingState
                },
                entities: {
                    [p: number]:
                        ThingState
                },
                regions: {
                    [p: number]: RegionInstance
                }) {
        this.players = agents;
        this.entities = entities;
        this.regions = regions;
    }

    /**
     * Generates the initial state of the game.
     *
     * This is the state of the game before any actions have been taking, including the application of any setup rules where any decisions are made or random elements applied.
     */
    static generateInitialState(game: Game, initialState: any): GameState {
        const agents: { [id: number]: ThingState } = {};
        if (game.agents.exactly) {
            for (let i = 1; i <= (game.agents.exactly); i++) {
                agents[i] = {
                    id: i
                };
            }
        }

        const locations: { [id: string]: RegionInstance } = {};
        locations["play_area"] = {
            id: "play_area",
            contains: []
        };
        for (const location of Object.values(game.locations)) {
            locations[location.id] = {
                id: location.id,
                contains: location.contains
            };
        }

        const entities: { [id: number]: ThingState } = {};
        if (initialState?.entities) {
            for (const [id, entity] of Object.entries(initialState.entities)) {
                entities[parseInt(id)] = {...entity as object, id: parseInt(id)};
            }
        }

        return new GameState(agents, entities, locations);
    }

    region(id: string) {
        if (!this.regions[id]) {
            throw new Error(`No location with id '${id}'.`);
        }
        return this.regions[id];
    }
}