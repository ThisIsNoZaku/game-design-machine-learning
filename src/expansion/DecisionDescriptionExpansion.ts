import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {DecisionDefinition} from "../definitions/DecisionDefinition";
import {DecisionDescription} from "../descriptions/DecisionDescription";
import {ExprDescriptionExpansion} from "./ExprDescriptionExpansion";
import {EffectDescriptionExpansion} from "./EffectDescriptionExpansion";

export class DecisionDescriptionExpansion implements DescriptionToDefinitionTransformer<DecisionDescription, DecisionDefinition> {
    private readonly exprExpansion = new ExprDescriptionExpansion();
    private readonly effectExpansion = new EffectDescriptionExpansion();

    transform(input: DecisionDescription): DecisionDefinition {
        return new DecisionDefinition(
            input.id,
            input.label,
            input.from,
            input.min,
            input.max,
            input.constrains?.map((item) => this.exprExpansion.transform(item)),
            input.effects?.map((item) => this.effectExpansion.transform(item)),
            input.dependsOn,
            input.dice
        );
    }
}
