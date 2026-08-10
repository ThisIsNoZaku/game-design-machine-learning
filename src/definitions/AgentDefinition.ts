/**
 * A decision maker that exists outside the rules of the game. Equivalent to a player in many games.
 */
export class AgentDefinition {
    id: string;
    properties?: Record<string, any>;

    constructor(id: string, properties?: Record<string, any>) {
        this.id = id;
        this.properties = properties;
    }
}