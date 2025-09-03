import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import dieSchema from "../../../src/json/schemas/die.schema.json";

describe("Die Schema", () => {
    let validateDie: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateDie = ajv.compile(dieSchema);
    });

    test("valid Die object", () => {
        const validDie = { sides: 6, count: 2 };
        expect(validateDie(validDie)).toBe(true);
    });

    test("invalid Die object (missing required property)", () => {
        const invalidDie = { sides: 6 };
        expect(validateDie(invalidDie)).toBe(false);
    });

    test("invalid Die object (invalid property value)", () => {
        const invalidDie = { sides: -6, count: 2 };
        expect(validateDie(invalidDie)).toBe(false);
    });
});