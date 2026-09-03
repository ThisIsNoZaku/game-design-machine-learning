import {ThingState} from "./ThingState";
import {BaseGameDefinition, GameDefinition} from "../definitions/BaseGameDefinition";
import {PLAY_AREA, RegionDefinition} from "../definitions/RegionDefinition";
import {v4} from "../uuid";
import {PlayAreaInstance, RegionInstance} from "./RegionInstance";

export type GameRegions = { playArea: PlayAreaInstance & {id: "play_area"}, [id: string]: RegionInstance };

export interface GameState {
    winners: string[];

    terminated: boolean;
    players: {
        active: string,
        [id: string]: ThingState | string
    };
    entities: { [id: number]: ThingState };
    regions: GameRegions;
}
/**
 * Defines the state of the game, including player, entities and environment properties.
 */
export class ConcreteGameState implements  GameState{
    players: {
        active: string,
        [id: string]: ThingState | string
    };
    entities: { [id: number]: ThingState };
    winners: string[];
    regions: GameRegions;
    // If true, the game has ended.
    terminated: boolean;

    constructor(agents: {
                    [p: string]:
                        ThingState
                },
                entities: {
                    [p: number]:
                        ThingState
                },
                regions: GameRegions) {
        // TODO: Rules for picking first active player
        this.players = {...agents, active: "1"};
        this.entities = entities;
        this.regions = regions;
        this.terminated = false;
        this.winners = [];
    }

    /**
     * Generates the initial state of the game.
     *
     * This is the state of the game before any actions have been taking, including the application of any setup rules where any decisions are made or random elements applied.
     */
    static generateInitialState(game: GameDefinition, initialState: GameState): GameState {
        if(!game.agents) {
            throw new Error("Game definition doesn't define agents");
        }
        const agents: { [id: number]: ThingState } = {};
        if (game.agents.exactly) {
            for (let i = 1; i <= (game.agents.exactly); i++) {
                agents[i] = {
                    id: "" + i
                };
            }
        }

        const locations: GameRegions = {
            playArea : {
                id: PLAY_AREA,
                contains: [],
                state: {...(initialState.regions[PLAY_AREA]?.state || {})},
                tags: new Set<string>()
            }
        };
        for (const location of Object.values(game.locations)) {
            locations[location.id] = {
                id: location.id,
                contains: location.contains,
                state: {...(initialState.regions[location.id]?.state || {})},
                tags: new Set<string>()
            };
        }

        const entities: { [id: number]: ThingState } = {};
        if (initialState?.entities) {
            for (const [id, entity] of Object.entries(initialState.entities)) {
                entities[parseInt(id)] = {...entity as object, id: v4() };
            }
        }

        return new ConcreteGameState(agents, entities, locations);
    }
}