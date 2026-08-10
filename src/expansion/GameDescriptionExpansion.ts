import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {BaseGameDefinition} from "../definitions/BaseGameDefinition";
import {Region} from "../definitions/Region";
import {BoardMLGameSpecTopLevelDescription} from "../descriptions/GameDescription";
import {ActionDescriptionExpansion} from "./ActionDescriptionExpansion";

export class GameDescriptionExpansion implements DescriptionToDefinitionTransformer<BoardMLGameSpecTopLevelDescription, BaseGameDefinition> {
    private readonly actionExpansion = new ActionDescriptionExpansion();

    transform(input: BoardMLGameSpecTopLevelDescription): BaseGameDefinition {
        const metadataName = this.getMetadataName(input);
        const [gameDefinition] = BaseGameDefinition.GenerateFromDefinition({
            metadata: {
                ...input.metadata,
                name: metadataName
            },
            parameters: input.parameters || {},
            actions: input.actions.map((action) => this.actionExpansion.transform(action)),
            agents: input.agents,
            locations: this.expandLocations(input.locations),
            initial: {}
        });
        return gameDefinition;
    }

    private getMetadataName(input: BoardMLGameSpecTopLevelDescription): string {
        const nameValue = (input.metadata as {name?: unknown}).name;
        if (typeof nameValue === "string" && nameValue.length > 0) {
            return nameValue;
        }
        return input.metadata.id;
    }

    private expandLocations(input: {[k: string]: BoardMLGameSpecTopLevelDescription["locations"][string]}): {[id: string]: Region} {
        return Object.entries(input).reduce<{[id: string]: Region}>((acc, [id, area]) => {
            const subRegionShape = area.shape
                ? {
                    rows: area.shape.rows,
                    cols: area.shape.cols,
                    state: area.shape.state || {}
                }
                : undefined;

            acc[id] = {
                id,
                contains: area.links || [],
                shape: subRegionShape,
                subRegionShape
            };
            return acc;
        }, {});
    }
}
