/**
 * A region is a location that entities can occupy within the environment of the game.
 *
 * Every game has a "Play Area" region.
 *
 * Regions can be nested within other regions to create a hierarchy of locations. For example, a "Board" region may contain multiple "Space" regions.
 */
import {ThingState} from "../state";

export interface RegionDefinition {
    id: string;
    contains: string[];
    shape?: RegionDefinitionShape
    subregions?: RegionDefinition[]
    subRegionShape?: RegionDefinitionShape
}

export type PlayAreaDefinition = RegionDefinition & {id: "play_area"};

export interface IrregularRegionDefinition extends RegionDefinition{
    /**
     * Definition for all subregions within this region.
     */
    subregions: RegionDefinition[];
}

/**
 * Definition for a region which is laid out in a regular grid pattern.
 */
export interface GridRegionDefinition extends  RegionDefinition {
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
    subRegionShape: RegionDefinitionShape
}

export interface RegionDefinitionShape {
    rows: number,
    cols: number,
    state: ThingState,
}

export class BaseRegionDefinition implements  RegionDefinition {
    id: string;
    shape: RegionDefinitionShape;
    contains: string[];
    subregions?: RegionDefinition[];

    constructor(
        id: string,
        shape: RegionDefinitionShape,
        subregions?: RegionDefinition[],
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
export class FixedAreaRegionDefinition extends BaseRegionDefinition {
    contains: string[];
    subregions: RegionDefinition[];

    constructor(
        id: string,
        shape: RegionDefinitionShape,
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

export function GenerateRegion(id:string, region: RegionDefinition): RegionDefinition {
    if (region.shape?.cols && region.shape?.rows) {
        const shape = region.subRegionShape || region.shape;
        return new FixedAreaRegionDefinition(id, {
            rows: shape.rows,
            cols: shape.cols,
            state: shape.state || {}
        });
    } else {
        return new BaseRegionDefinition(id, {rows: 0, cols: 0, state: region.shape?.state || {}}, region.subregions);
    }
}

export type RegionId = string;

export const PLAY_AREA = "play_area";