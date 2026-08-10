import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {EntityDefinition} from "../definitions/EntityDefinition";
import {EntityDescription} from "../descriptions/EntityDescription";

export class EntityDescriptionExpansion implements DescriptionToDefinitionTransformer<EntityDescription, EntityDefinition> {
    transform(input: EntityDescription): EntityDefinition {
        const archetypeValue = (input as {archetype?: unknown}).archetype;
        const archetype = typeof archetypeValue === "string" ? archetypeValue : input.id;
        return new EntityDefinition(input.id, archetype, undefined, undefined, undefined, input.state);
    }
}
