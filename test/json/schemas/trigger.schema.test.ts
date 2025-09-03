import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import triggerSchema from "../../../src/json/schemas/trigger.schema.json";

describe("Trigger Schema", () => {
    let validateTrigger: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateTrigger = ajv.compile(triggerSchema);
    });

    test("valid Trigger object", () => {
        const validTrigger = { event: "onStart", action: "someAction" };
        expect(validateTrigger(validTrigger)).toBe(true);
    });

    test("invalid Trigger object (missing required property)", () => {
        const invalidTrigger = { event: "onStart" };
        expect(validateTrigger(invalidTrigger)).toBe(false);
    });

    test("invalid Trigger object (invalid event type)", () => {
        const invalidTrigger = { event: 123, action: "someAction" };
        expect(validateTrigger(invalidTrigger)).toBe(false);
    });
});