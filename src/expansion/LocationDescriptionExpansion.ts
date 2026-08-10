import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {Region} from "../definitions/Region";
import {AreaDescription} from "../descriptions/LocationDescription";

export class LocationDescriptionExpansion implements DescriptionToDefinitionTransformer<AreaDescription, Region> {
    transform(input: AreaDescription): Region {
        const idValue = (input as {id?: unknown}).id;
        const id = typeof idValue === "string" ? idValue : "region";
        const shape = input.shape
            ? {
                rows: input.shape.rows,
                cols: input.shape.cols,
                state: input.shape.state || {}
            }
            : undefined;
        return {
            id,
            contains: input.links || [],
            shape,
            subRegionShape: shape
        };
    }
}
