class Entity {
    id: string;
    archetype: string;
    area?: string;
    slot?: string;
    owner?: string;
    state?: Record<string, number | string | boolean>;

    constructor(
        id: string,
        archetype: string,
        area?: string,
        slot?: string,
        owner?: string,
        state?: Record<string, number | string | boolean>
    ) {
        this.id = id;
        this.archetype = archetype;
        this.area = area;
        this.slot = slot;
        this.owner = owner;
        this.state = state;
    }
}