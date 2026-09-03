import {RegionId} from "../definitions/RegionDefinition";
import {GameRegions} from "./GameState";

/**
 * An instance of a Region within the Game State.
 *
 * Used to track stateful information about a Region during gameplay.
 */
export interface RegionInstance {
    id: RegionId;
    contains?: string[];
    state: Record<string, any>;
    tags: Set<string>;
}

export type PlayAreaInstance = RegionInstance & {id: "play_area"};