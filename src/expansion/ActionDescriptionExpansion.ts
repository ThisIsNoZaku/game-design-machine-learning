import {ActionDefinition} from "../definitions/ActionDefinition";
import {ActionResolutionTree} from "../definitions/ActionResolutionTree";
import {DefinitionGenerator} from "../definitions/DefinitionGenerator";
import {EffectActionStep} from "../definitions/EffectActionStep";
import {ActionDescription} from "../descriptions/ActionDescription";

type Scalar = string | number | boolean;

export class ActionDescriptionExpansion implements DefinitionGenerator<ActionDescription, ActionDefinition> {
    define(input: ActionDescription): ActionDefinition {
        const actorValue = (input as {actor?: unknown}).actor;
        const actor = typeof actorValue === "string" ? actorValue : "agent";
        const parameters = this.expandParameters(input);

        return new ActionDefinition(
            input.id,
            actor,
            new ActionResolutionTree(new EffectActionStep()),
            input.label,
            undefined,
            input.tags,
            parameters
        );
    }

    private expandParameters(input: ActionDescription): Record<string, Scalar> | undefined {
        if (!input.parameters) {
            return undefined;
        }
        return Object.keys(input.parameters).reduce<Record<string, Scalar>>((acc, key) => {
            acc[key] = key;
            return acc;
        }, {});
    }
}
