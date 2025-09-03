import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import decisionSchema from "../../../src/json/schemas/decision.schema.json";

describe("Decision Schema", () => {
    let validateDecision: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateDecision = ajv.compile(decisionSchema);
    });

    test("valid Decision object", () => {
        const validDecision = {
            id: "decision1",
            kind: "select-entity",
            label: "Choose an entity",
            min: 1,
            max: 3,
        };
        expect(validateDecision(validDecision)).toBe(true);
    });

    test("invalid Decision object (missing required property)", () => {
        const invalidDecision = { kind: "select-entity" };
        expect(validateDecision(invalidDecision)).toBe(false);
    });

    test("invalid Decision object (invalid enum value)", () => {
        const invalidDecision = { id: "decision1", kind: "invalidKind" };
        expect(validateDecision(invalidDecision)).toBe(false);
    });
});