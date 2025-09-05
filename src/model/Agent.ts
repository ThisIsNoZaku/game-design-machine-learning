/**
 * A decision maker that exists outside the rules of the game.
 */
export class Agent {
    id: string;
    properties?: Record<string, any>;

    constructor(id: string, properties?: Record<string, any>) {
        this.id = id;
        this.properties = properties;
    }
}