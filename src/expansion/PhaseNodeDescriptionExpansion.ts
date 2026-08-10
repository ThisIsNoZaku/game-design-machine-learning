import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {PhaseNode} from "../definitions/PhaseNode";
import {PhaseNodeDescription} from "../descriptions/PhaseNodeDescription";
import {EffectDescriptionExpansion} from "./EffectDescriptionExpansion";
import {TransitionDescriptionExpansion} from "./TransitionDescriptionExpansion";

export class PhaseNodeDescriptionExpansion implements DescriptionToDefinitionTransformer<PhaseNodeDescription, PhaseNode> {
    private readonly effectExpansion = new EffectDescriptionExpansion();
    private readonly transitionExpansion = new TransitionDescriptionExpansion();

    transform(input: PhaseNodeDescription): PhaseNode {
        return new PhaseNode(
            input.id,
            input.label,
            input.enabledActions,
            input.onEnter?.map((effect) => this.effectExpansion.transform(effect)),
            input.onExit?.map((effect) => this.effectExpansion.transform(effect)),
            input.transitions?.map((transition) => this.transitionExpansion.transform(transition))
        );
    }
}
