/**
 * A region is a location that entities can occupy within the environment of the game.
 *
 * Every game has a "Play Area" region.
 *
 * Regions can be nested within other regions to create a hierarchy of locations. For example, a "Board" region may contain multiple "Space" regions.
 */
export default class Region {
    id: string;
    name?: string;
    owner?: string;
    shape?: {
        rows: number;
        cols: number;
        adjacency?: string;
    };
    links?: string[];
    constrains?: Expr[];

    constructor(
        id: string,
        name?: string,
        owner?: string,
        shape?: { rows: number; cols: number; adjacency?: string },
        links?: string[],
        constrains?: Expr[]
    ) {
        this.id = id;
        this.name = name;
        this.owner = owner;
        this.shape = shape;
        this.links = links;
        this.constrains = constrains;
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