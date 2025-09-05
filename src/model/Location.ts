namespace Model {
    class Location {
        id: string;
        name?: string;
        owner?: string;
        shape?: {
            rows?: number;
            cols?: number;
            adjacency?: string;
        };
        links?: string[];
        constrains?: Expr[];

        constructor(
            id: string,
            name?: string,
            owner?: string,
            shape?: { rows?: number; cols?: number; adjacency?: string },
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
}