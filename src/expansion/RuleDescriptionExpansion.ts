import Selector from "../Selector";
import {DescriptionToDefinitionTransformer} from "../definitions/DescriptionToDefinitionTransformer";
import {
    AgentRuleTarget,
    EntityRuleTarget,
    LocationRuleTarget,
    Rule,
    RuleType
} from "../definitions/Rule";
import {RuleDescription} from "../descriptions/RuleDescription";

type RuleTargets = {
    entity?: EntityRuleTarget[];
    location?: LocationRuleTarget[];
    agent?: AgentRuleTarget[];
};

export class RuleDescriptionExpansion implements DescriptionToDefinitionTransformer<RuleDescription, Rule> {
    transform(input: RuleDescription): Rule {
        const type: RuleType = "constrains" in input ? "constraint" : "triggered";
        const idValue = (input as {id?: unknown}).id;
        const id = typeof idValue === "string" ? idValue : "rule";
        const targets = this.expandTargets(input);
        return new Rule(id, type, targets, input.description);
    }

    private expandTargets(input: RuleDescription): RuleTargets {
        const expandedTargets: RuleTargets = {};
        if (!("constrains" in input) || !input.constrains) {
            return expandedTargets;
        }

        if ("entity" in input.constrains) {
            expandedTargets.entity = [new EntityRuleTarget("entity", new Selector())];
        }
        if ("location" in input.constrains) {
            expandedTargets.location = [new LocationRuleTarget("location", new Selector())];
        }
        if ("agent" in input.constrains) {
            expandedTargets.agent = [new AgentRuleTarget("agent", new Selector())];
        }
        return expandedTargets;
    }
}
