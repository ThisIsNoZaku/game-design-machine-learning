import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import actionSchema from "../../../src/json/schemas/action.schema.json";

describe("Action Schema", () => {
    let validateAction: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
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