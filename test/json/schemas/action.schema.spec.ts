import { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import actionSchema from "../../../src/json/schemas/action.schema.json";
import decisionSchema from "../../../src/json/schemas/decision.schema.json";
import effectSchema from "../../../src/json/schemas/effect.schema.json";
import expressionSchema from "../../../src/json/schemas/expression.schema.json";
import {addSchemas} from "../../../src/json/schemas";
import formatValidationErrors from "../../../src/json/formatSchemaErrors";
import "jest-expect-message";

describe("Action Schema", () => {
    let validateAction: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        addSchemas(ajv);

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
});