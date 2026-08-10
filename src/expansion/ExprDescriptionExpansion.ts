import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {Expr} from "../definitions/Expr";
import {ExprDescription} from "../descriptions/ExpressionDescription";

export class ExprDescriptionExpansion implements DescriptionToDefinitionTransformer<ExprDescription, Expr> {
    transform(input: ExprDescription): Expr {
        return new Expr(input.expr, input.explain);
    }
}
