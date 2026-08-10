import {Expr} from "./Expr";

export class Transition {
    from: string[];
    to: string;
    trigger: Expr;

    constructor(from: string[], to: string, trigger: Expr) {
        this.from = from;
        this.to = to;
        this.trigger = trigger;
    }
}