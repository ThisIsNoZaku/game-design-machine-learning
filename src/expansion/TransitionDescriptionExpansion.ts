import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {Transition} from "../definitions/Transition";
import {TransitionDescription} from "../descriptions/TransitionDescription";
import {ExprDescriptionExpansion} from "./ExprDescriptionExpansion";

export class TransitionDescriptionExpansion implements DescriptionToDefinitionTransformer<TransitionDescription, Transition> {
    private readonly exprExpansion = new ExprDescriptionExpansion();

    transform(input: TransitionDescription): Transition {
        return new Transition([...input.from], input.to, this.exprExpansion.transform(input.trigger));
    }
}
