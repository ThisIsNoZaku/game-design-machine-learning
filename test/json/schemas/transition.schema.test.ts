import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import transitionSchema from "../../../src/json/schemas/transition.schema.json";

describe("Transition Schema", () => {
    let validateTransition: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateTransition = ajv.compile(transitionSchema);
    });

    test("valid Transition object", () => {
        const validTransition = { from: "phase1", to: "phase2", condition: "someCondition" };
        expect(validateTransition(validTransition)).toBe(true);
    });

    test("invalid Transition object (missing required property)", () => {
        const invalidTransition = { from: "phase1", to: "phase2" };
        expect(validateTransition(invalidTransition)).toBe(false);
    });

    test("invalid Transition object (invalid property type)", () => {
        const invalidTransition = { from: "phase1", to: 123, condition: "someCondition" };
        expect(validateTransition(invalidTransition)).toBe(false);
    });
});