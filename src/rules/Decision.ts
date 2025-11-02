class Decision {
    id: string;
    label?: string;
    from?: string;
    min?: number;
    max?: number;
    constrains?: Expr[];
    effects?: Effect[];
    dependsOn?: string[];
    dice?: string;

    constructor(
        id: string,
        label?: string,
        from?: string,
        min?: number,
        max?: number,
        constrains?: Expr[],
        effects?: Effect[],
        dependsOn?: string[],
        dice?: string
    ) {
        this.id = id;
        this.label = label;
        this.from = from;
        this.min = min;
        this.max = max;
        this.constrains = constrains;
        this.effects = effects;
        this.dependsOn = dependsOn;
        this.dice = dice;
    }
}