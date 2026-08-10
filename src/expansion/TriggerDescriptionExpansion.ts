import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {Trigger} from "../definitions/Trigger";
import {TriggerDescription} from "../descriptions/TriggerDescription";
import {EffectDescriptionExpansion} from "./EffectDescriptionExpansion";

export class TriggerDescriptionExpansion implements DescriptionToDefinitionTransformer<TriggerDescription, Trigger> {
    private readonly effectExpansion = new EffectDescriptionExpansion();

    transform(input: TriggerDescription): Trigger {
        return new Trigger(
            input.id,
            input.effects?.map((effect) => this.effectExpansion.transform(effect)),
            input.limit
        );
    }
}
