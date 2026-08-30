import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {BaseGameDefinition, GameDefinition} from "../definitions/BaseGameDefinition";
import {PLAY_AREA, Region} from "../definitions/Region";
import {BoardMLGameSpecTopLevelDescription} from "../descriptions/GameDescription";
import {ActionDescriptionExpansion} from "./ActionDescriptionExpansion";
import {LocationDescriptionExpansion} from "./LocationDescriptionExpansion";
import {FeatureSpec} from "../specification/ModelSpecs";
import {AreaDescription} from "../descriptions/LocationDescription";

export class GameDescriptionExpansion implements DescriptionToDefinitionTransformer<BoardMLGameSpecTopLevelDescription, GameDefinition> {
    private readonly actionExpansion = new ActionDescriptionExpansion();
    private readonly locationExpansion = new LocationDescriptionExpansion();

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

    private expandLocations(input: { [k: string]: AreaDescription }): {
        play_area: Region;
        [id: string]: Region
    } {
        const locations = Object.entries(input).reduce<{ play_area: Region, [id: string]: Region }>((acc, [id, area]) => {
            acc[id] = this.locationExpansion.transform({
                ...area,
                id
            });
            return acc;
        }, {
            play_area: this.locationExpansion.transform({
                id: PLAY_AREA
            })
        });
        locations[PLAY_AREA].contains = Object.keys(input).filter((id => id !== PLAY_AREA));
        return locations;
    }
}
