import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import phasesSchema from "../../../src/json/schemas/phases.schema.json";

describe("Phases Schema", () => {
    let validatePhases: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validatePhases = ajv.compile(phasesSchema);
    });

    test("valid Phases object", () => {
        const validPhases = [{ id: "phase1", label: "Start Phase" }];
        expect(validatePhases(validPhases)).toBe(true);
    });

    test("invalid Phases object (missing required property)", () => {
        const invalidPhases = [{ label: "Start Phase" }];
        expect(validatePhases(invalidPhases)).toBe(false);
    });

    test("invalid Phases object (invalid property type)", () => {
        const invalidPhases = [{ id: 123, label: "Start Phase" }];
        expect(validatePhases(invalidPhases)).toBe(false);
    });
});