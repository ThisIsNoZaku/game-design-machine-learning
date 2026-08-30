import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {RegionDefinition} from "../definitions/RegionDefinition";
import {AreaDescription} from "../descriptions/LocationDescription";

export class LocationDescriptionExpansion implements DescriptionToDefinitionTransformer<AreaDescription, RegionDefinition> {
    transform(input: AreaDescription): RegionDefinition {
        const idValue = (input as {id?: unknown}).id;
        const id = typeof idValue === "string" ? idValue : "region";
        const shape = input.shape
            ? {
                rows: input.shape.rows,
                cols: input.shape.cols,
                state: input.shape.state || {}
            }
            : {
                rows: 0,
                cols: 0,
                state: {}
            };
        const subregions = input.shape
            ? Array.from({length: shape.cols}, (_, col) =>
                Array.from({length: shape.rows}, (_, row): RegionDefinition => ({
                    id: `${id}_${col}_${row}`,
                    contains: []
                }))
            ).flat()
            : undefined;
        return {
            id,
            contains: subregions ? subregions.map(region => region.id) : (input.links || []),
            shape,
            subRegionShape: input.shape ? shape : undefined,
            subregions
        };
    }
}
