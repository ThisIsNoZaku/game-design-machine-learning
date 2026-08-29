import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {BaseGameDefinition, GameDefinition} from "../definitions/BaseGameDefinition";
import {Region} from "../definitions/Region";
import {BoardMLGameSpecTopLevelDescription} from "../descriptions/GameDescription";
import {ActionDescriptionExpansion} from "./ActionDescriptionExpansion";
import {FeatureSpec} from "../specification/ModelSpecs";

export class GameDescriptionExpansion implements DescriptionToDefinitionTransformer<BoardMLGameSpecTopLevelDescription, GameDefinition> {
    private readonly actionExpansion = new ActionDescriptionExpansion();

    transform(input: BoardMLGameSpecTopLevelDescription): GameDefinition {
        const metadataName = this.getMetadataName(input);
        const [gameDefinition] = BaseGameDefinition.GenerateFromDefinition({
            metadata: {
                ...input.metadata,
                name: metadataName
            },
            resolveActionSelection: (state, prediction) => ({
                action: {
                    id: "not_implemented",
                    parameters: {},
                    execute(game, state, parameters) {
                    }
                },
                parameters: {}
            }),
            getObservation(state, game) {
                return state;
            },
            spec() {
                return Promise.resolve({} as FeatureSpec);
            },
            parameters: input.parameters || {},
            actions: input.actions.map((action) => this.actionExpansion.transform(action)),
            agents: input.agents,
            locations: this.expandLocations(input.locations),
            getInitialState: () => ({
                winners: [],
                terminated: false,
                players: {
                    active: "1",
                    ...Object.fromEntries(Object.keys(input.agents).map(id => [id, {}]))
                },
                entities: {},
                regions: {
                    playArea: {
                        id: "play_area",
                        state: {}
                    }
                }
            })
        });
        return gameDefinition;
    }

    private getMetadataName(input: BoardMLGameSpecTopLevelDescription): string {
        const nameValue = (input.metadata as { name?: unknown }).name;
        if (typeof nameValue === "string" && nameValue.length > 0) {
            return nameValue;
        }
        return input.metadata.id;
    }

    private expandLocations(input: { [k: string]: BoardMLGameSpecTopLevelDescription["locations"][string] }): {
        [id: string]: Region
    } {
        return Object.entries(input).reduce<{ [id: string]: Region }>((acc, [id, area]) => {
            const subRegionShape = area.shape
                ? {
                    id,
                    rows: area.shape.rows,
                    cols: area.shape.cols,
                    state: {id, ...(area.shape.state || {})}
                }
                : undefined;

            acc[id] = {
                id,
                contains: area.links || [],
                shape: subRegionShape
            };
            return acc;
        }, {});
    }
}
