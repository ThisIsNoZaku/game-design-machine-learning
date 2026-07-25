import action from "./action.schema.json";
import agent from "./agent.schema.json";
import location from "./location.schema.json";
import decision from "./decision.schema.json";
import die from "./die.schema.json";
import effect from "./effect.schema.json";
import entity from "./entity.schema.json";
import expression from "./expression.schema.json";
import game from "./game.schema.json";
import phaseNode from "./phaseNode.schema.json";
import phases from "./phases.schema.json";
import rule from "./rule.schema.json";
import transition from "./transition.schema.json";
import trigger from "./trigger.schema.json";
import select from "./select.schema.json";
import rng from "./rng.schema.json";
import Ajv2020 from "ajv/dist/2020";

export function addSchemas(ajv: Ajv2020) {
    ajv.addSchema(action, "boardml/action.schema.json");
    ajv.addSchema(agent, "boardml/agent.schema.json");
    ajv.addSchema(decision, "boardml/decision.schema.json");
    ajv.addSchema(die, "boardml/die.schema.json");
    ajv.addSchema(effect, "boardml/effect.schema.json");
    ajv.addSchema(entity, "boardml/entity.schema.json");
    ajv.addSchema(expression, "boardml/expression.schema.json");
    ajv.addSchema(game, "boardml/game.schema.json");
    ajv.addSchema(location, "boardml/location.schema.json");
    ajv.addSchema(phaseNode, "boardml/phaseNode.schema.json");
    ajv.addSchema(phases, "boardml/phases.schema.json");
    ajv.addSchema(rule, "boardml/rule.schema.json");
    ajv.addSchema(select, "boardml/select.schema.json");
    ajv.addSchema(transition, "boardml/transition.schema.json");
    ajv.addSchema(trigger, "boardml/trigger.schema.json");
    ajv.addSchema(rng, "boardml/rng.schema.json");
}

export {
    action,
    agent,
    decision,
    die,
    effect,
    entity,
    expression,
    game,
    location,
    phaseNode,
    phases,
    rule,
    transition,
    trigger
};