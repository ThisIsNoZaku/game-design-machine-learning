import {ActionDefinition, BaseActionDefinition} from "../definitions/ActionDefinition";
import {ActionResolutionTree} from "../definitions/ActionResolutionTree";
import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {EffectActionStep} from "../definitions/EffectActionStep";
import {ActionDescription} from "../descriptions/ActionDescription";

export class ActionDescriptionExpansion implements DescriptionToDefinitionTransformer<ActionDescription, ActionDefinition> {
    transform(input: ActionDescription): ActionDefinition {
        const actorValue = (input as {actor?: unknown}).actor;
        const actor = typeof actorValue === "string" ? actorValue : "agent";
        const parameters = this.expandParameters(input);

        return new BaseActionDefinition(
            input.id,
            actor,
            new ActionResolutionTree(new EffectActionStep()),
            input.label,
            undefined,
            input.tags,
            parameters
        );
    }

    private expandParameters(input: ActionDescription): Record<string, "string" | "number" | "boolean"> | undefined {
        if (!input.parameters) {
            return undefined;
        }
        return Object.keys(input.parameters).reduce<Record<string, "string" | "number" | "boolean">>((acc, key) => {
            acc[key] = "string";
            return acc;
        }, {});
    }
}