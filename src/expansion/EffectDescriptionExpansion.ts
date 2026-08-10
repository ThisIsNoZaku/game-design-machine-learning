import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {Effect} from "../definitions/Effect";
import {EffectDescription} from "../descriptions/EffectDescription";
import {ExprDescriptionExpansion} from "./ExprDescriptionExpansion";

export class EffectDescriptionExpansion implements DescriptionToDefinitionTransformer<EffectDescription, Effect> {
    private readonly exprExpansion = new ExprDescriptionExpansion();

    transform(input: EffectDescription): Effect {
        return new Effect(
            input.expr,
            input.chance,
            input.if ? this.exprExpansion.transform(input.if) : undefined
        );
    }
}
