import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {Expression} from "../definitions/Expression";
import {ExprDescription} from "../descriptions/ExpressionDescription";

export class ExpressionDescriptionExpansion implements DescriptionToDefinitionTransformer<ExprDescription, Expression> {
    transform(_input: ExprDescription): Expression {
        return new Expression();
    }
}
