import { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import actionSchema from "../../../src/json/schemas/action.schema.json";
import decisionSchema from "../../../src/json/schemas/decision.schema.json";
import effectSchema from "../../../src/json/schemas/effect.schema.json";
import expressionSchema from "../../../src/json/schemas/expression.schema.json";

describe("Action Schema", () => {
    let validateAction: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        ajv.addSchema(decisionSchema, "decision.schema.json");
        ajv.addSchema(effectSchema, "effect.schema.json");
        ajv.addSchema(expressionSchema, "expression.schema.json");
        addFormats(ajv);
        validateAction = ajv.compile(actionSchema);
    });

    test("valid Action object", () => {
        const validAction = {
            id: "action1",
            actor: "agent1",
            decisions: [{ id: "decision1", kind: "select-entity" }],
        };
        expect(validateAction(validAction)).toBe(true);
    });

    test("invalid Action object (missing required property)", () => {
        const invalidAction = { actor: "agent1" };
        expect(validateAction(invalidAction)).toBe(false);
    });

    test("invalid Action object (invalid nested decision)", () => {
        const invalidAction = {
            id: "action1",
            actor: "agent1",
            decisions: [{ id: "decision1", kind: "invalidKind" }],
        };
        expect(validateAction(invalidAction)).toBe(false);
    });
});