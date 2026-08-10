import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {DieDefinition} from "../definitions/DieDefinition";
import {RNGConfigDescription} from "../descriptions/DieDescription";

const DEFAULT_SIDES: Array<number> = [1, 2, 3, 4, 5, 6];

export class DieDescriptionExpansion implements DescriptionToDefinitionTransformer<RNGConfigDescription, DieDefinition> {
    transform(input: RNGConfigDescription): DieDefinition {
        return new DieDefinition(DEFAULT_SIDES, input.seed);
    }
}
