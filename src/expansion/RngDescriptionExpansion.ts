import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {DieDefinition} from "../definitions/DieDefinition";
import {SrcJsonSchemasRngSchemaJson} from "../descriptions/RngDescription";

const DEFAULT_SIDES: Array<number> = [1, 2, 3, 4, 5, 6];

export class RngDescriptionExpansion implements DescriptionToDefinitionTransformer<SrcJsonSchemasRngSchemaJson, DieDefinition> {
    transform(input: SrcJsonSchemasRngSchemaJson): DieDefinition {
        const seedValue = (input as {seed?: unknown}).seed;
        const seed = typeof seedValue === "number" ? seedValue : undefined;
        return new DieDefinition(DEFAULT_SIDES, seed);
    }
}
