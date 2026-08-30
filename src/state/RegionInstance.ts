import {RegionId} from "../definitions/RegionDefinition";

/**
 * An instance of a Region within the Game State.
 *
 * Used to track stateful information about a Region during gameplay.
 */
export interface RegionInstance {
    id: RegionId;
    contains?: string[];
    state: Record<string, any>;
}