export class DieDefinition {
    seed?: number;
    sides: (number | string)[];

    constructor(sides: (number | string)[], seed?: number) {
        this.sides = sides;
        this.seed = seed;
    }
}