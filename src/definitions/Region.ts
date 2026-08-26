/**
 * A region is a location that entities can occupy within the environment of the game.
 *
 * Every game has a "Play Area" region.
 *
 * Regions can be nested within other regions to create a hierarchy of locations. For example, a "Board" region may contain multiple "Space" regions.
 */
import {ThingState} from "../state";

export interface Region {
    id: string;
    contains: string[];
    shape?: RegionShape
    subregions?: Region[]
    subRegionShape?: RegionShape
}

export interface IrregularRegion extends Region{
    /**
     * Definition for all subregions within this region.
     */
    subregions: Region[];
}

/**
 * Definition for a region which is laid out in a regular grid pattern.
 */
export interface GridRegion extends  Region {
    /**
     * How many columns the grid has.
     */
    cols: number;
    /**
     * How many rows the grid has.
     */
    rows: number;
    /**
    * State shape of all subregions within this region
    */
    subRegionShape: RegionShape
}

export interface RegionShape {
    rows: number,
    cols: number,
    state: ThingState,
}

export class BaseRegion implements  Region {
    id: string;
    shape: RegionShape;
    contains: string[];
    subregions?: Region[];

    constructor(
        id: string,
        shape: RegionShape,
        subregions?: Region[],
    ) {
        if(!id) {
            throw new Error("ID must be defined");
        }
        if(!shape) {
            throw new Error("Shape must be defined");
        }
        this.id = id;
        this.shape = shape;
        this.subregions = subregions;
        this.contains = (this.subregions || []).map(r => r.id);
    }
}

/**
 * A region defined by a fixed area instead of listing out all contained locations.
 *
 * Used for situations where there are a regular arrangement of locations, like the grid of a chess board for example.
 */
export class FixedAreaRegion extends BaseRegion {
    contains: string[];
    subregions: Region[];

    constructor(
        id: string,
        shape: RegionShape,
    ) {
        super(id, shape)
        this.subregions = Array.from({length: shape!.cols}, (_, col) =>
            Array.from({length: shape!.rows}, (_, row) => {
                return {
                    id: `${id}_${col}_${row}`,
                    contains: []
                }
            })).flat();
        this.contains = this.subregions.map(r => r.id);
    }
}

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

export function GenerateRegion(id:string, region: Region): Region {
    if (region.shape?.cols && region.shape?.rows) {
        const shape = region.subRegionShape || region.shape;
        return new FixedAreaRegion(id, {
            rows: shape.rows,
            cols: shape.cols,
            state: shape.state || {}
        });
    } else {
        return new BaseRegion(id, {rows: 0, cols: 0, state: region.shape?.state || {}}, region.subregions);
    }
}

export type RegionId = string;

export const PLAY_AREA = "play_area";