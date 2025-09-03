import {JSONSchemaType, ValidateFunction} from "ajv";
import Ajv2020 from "ajv/dist/2020";
import action from "./schemas/action.schema.json";
import agent from "./schemas/agent.schema.json";
import area from "./schemas/area.schema.json";
import decision from "./schemas/decision.schema.json";
import die from "./schemas/die.schema.json";
import effect from "./schemas/effect.schema.json";
import entity from "./schemas/entity.schema.json";
import expression from "./schemas/expression.schema.json";
import game from "./schemas/game.schema.json";
import identifier from "./schemas/identifier.schema.json";
import phaseNode from "./schemas/phaseNode.schema.json";
import phases from "./schemas/phases.schema.json";
import rule from "./schemas/rule.schema.json";
import transition from "./schemas/transition.schema.json";
import trigger from "./schemas/trigger.schema.json";

export class RuleDocumentValidator {
    private validator: ValidateFunction<any>;

    constructor() {
        const schema = new Ajv2020();
        schema.addSchema(action as JSONSchemaType<any>, "action");
        schema.addSchema(agent as JSONSchemaType<any>, "agent");
        schema.addSchema(area as JSONSchemaType<any>, "area");
        schema.addSchema(decision as JSONSchemaType<any>, "decision");
        schema.addSchema(die as JSONSchemaType<any>, "die");
        schema.addSchema(effect as JSONSchemaType<any>, "effect");
        schema.addSchema(entity as JSONSchemaType<any>, "entity");
        schema.addSchema(expression as JSONSchemaType<any>, "expression");
        schema.addSchema(identifier as JSONSchemaType<any>, "identifier");
        schema.addSchema(phaseNode as JSONSchemaType<any>, "phaseNode");
        schema.addSchema(phases as JSONSchemaType<any>, "phases");
        schema.addSchema(rule as JSONSchemaType<any>, "rule");
        schema.addSchema(transition as JSONSchemaType<any>, "transition");
        schema.addSchema(trigger as JSONSchemaType<any>, "trigger");
        this.validator = schema.compile(game);

    }

    validate(input: string | object) {
        let valid = false;
        if(typeof input === "string") {
            valid = this.validateString(input);
        } else if(typeof input === "object") {
            valid = this.validateObject(input);
        } else {
            throw new Error("Input must be a string or an object");
        }

        if(!valid) {
            return this.validator.errors;
        } else {
            return true;
        }
    }



    validateString(jsonString: string) {
        return this.validator(JSON.parse(jsonString)) as boolean;
    }

    validateObject(jsonObject: object) {
        return this.validator(jsonObject) as boolean;
    }

}