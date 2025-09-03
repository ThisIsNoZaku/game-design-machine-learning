import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import effectSchema from "../../../src/json/schemas/effect.schema.json";

describe("Effect Schema", () => {
    let validateEffect: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateEffect = ajv.compile(effectSchema);
    });

    test("valid Effect object", () => {
        const validEffect = { expr: "someExpression", chance: 0.5 };
        expect(validateEffect(validEffect)).toBe(true);
    });

    test("invalid Effect object (missing required property)", () => {
        const invalidEffect = { chance: 0.5 };
        expect(validateEffect(invalidEffect)).toBe(false);
    });

    test("invalid Effect object (invalid chance value)", () => {
        const invalidEffect = { expr: "someExpression", chance: 1.5 };
        expect(validateEffect(invalidEffect)).toBe(false);
    });
});