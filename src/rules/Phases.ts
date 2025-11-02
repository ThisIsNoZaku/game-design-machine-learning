class Phases {
    initial: string;
    nodes: Record<string, PhaseNode>;

    constructor(initial: string, nodes: Record<string, PhaseNode>) {
        this.initial = initial;
        this.nodes = nodes;
    }
}