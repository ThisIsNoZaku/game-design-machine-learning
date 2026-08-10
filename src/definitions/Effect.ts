import {Expr} from "./Expr";

export class Effect {
    expr: string;
    chance?: number;
    if?: Expr;

    constructor(expr: string, chance?: number, ifExpr?: Expr) {
        this.expr = expr;
        this.chance = chance;
        this.if = ifExpr;
    }
}