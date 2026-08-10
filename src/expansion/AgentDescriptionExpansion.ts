import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {AgentDefinition} from "../definitions/AgentDefinition";
import {AgentDescription} from "../descriptions/AgentDescription";

export class AgentDescriptionExpansion implements DescriptionToDefinitionTransformer<AgentDescription, AgentDefinition> {
    transform(input: AgentDescription): AgentDefinition {
        return new AgentDefinition(String(input.id), input.properties);
    }
}
