/**
 * A region is a location that entities can occupy within the environment of the game.
 *
 * Every game has a "Play Area" region.
 *
 * Regions can be nested within other regions to create a hierarchy of locations. For example, a "Board" region may contain multiple "Space" regions.
 */

export interface Region {
    id: string;
    contains: string[];
    shape?: {
        rows: number;
        cols: number;
    };
}

/**
 * A region defined by a shape instead of listing out all contained locations.
 *
 * Used for situations where there are a regular arrangement of locations, like a chess board for example.
 */
export class ShapeRegion implements Region {
    id: string;
    shape: {
        rows: number;
        cols: number;
    };
    contains: string[];
    subregions: Region[];

    constructor(
        id: string,
        shape: { rows: number; cols: number;}
    ) {
        this.id = id;
        this.shape = shape;
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
    id: string;
    contains?: string[];
}