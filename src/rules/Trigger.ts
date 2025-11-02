class Trigger {
    id?: string;
    effects?: Effect[];
    limit?: number;

    constructor(id?: string, effects?: Effect[], limit?: number) {
        this.id = id;
        this.effects = effects;
        this.limit = limit;
    }
}