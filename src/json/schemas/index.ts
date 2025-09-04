import action from "./action.schema.json";
import agent from "./agent.schema.json";
import area from "./area.schema.json";
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
import Ajv2020 from "ajv/dist/2020";

export function addSchemas(ajv: Ajv2020) {
    ajv.addSchema(action, "action.schema.json");
    ajv.addSchema(agent, "agent.schema.json");
    ajv.addSchema(area, "area.schema.json");
    ajv.addSchema(decision, "decision.schema.json");
    ajv.addSchema(die, "die.schema.json");
    ajv.addSchema(effect, "effect.schema.json");
    ajv.addSchema(entity, "entity.schema.json");
    ajv.addSchema(expression, "expression.schema.json");
    ajv.addSchema(game, "game.schema.json");
    ajv.addSchema(phaseNode, "phaseNode.schema.json");
    ajv.addSchema(phases, "phases.schema.json");
    ajv.addSchema(rule, "rule.schema.json");
    ajv.addSchema(transition, "transition.schema.json");
    ajv.addSchema(trigger, "trigger.schema.json");
}

export {
    action,
    agent,
    area,
    decision,
    die,
    effect,
    entity,
    expression,
    game,
    phaseNode,
    phases,
    rule,
    transition,
    trigger
};