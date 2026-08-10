export class Expr {
    expr: string;
    explain?: string;

    constructor(expr: string, explain?: string) {
        this.expr = expr;
        this.explain = explain;
    }
}