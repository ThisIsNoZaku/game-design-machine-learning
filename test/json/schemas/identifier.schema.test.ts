import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import identifierSchema from "../../../src/json/schemas/identifier.schema.json";

describe("Identifier Schema", () => {
    let validateIdentifier: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateIdentifier = ajv.compile(identifierSchema);
    });

    test("valid Identifier object", () => {
        const validIdentifier = { id: "identifier1", type: "unique" };
        expect(validateIdentifier(validIdentifier)).toBe(true);
    });

    test("invalid Identifier object (missing required property)", () => {
        const invalidIdentifier = { type: "unique" };
        expect(validateIdentifier(invalidIdentifier)).toBe(false);
    });

    test("invalid Identifier object (invalid type)", () => {
        const invalidIdentifier = { id: "identifier1", type: "invalid" };
        expect(validateIdentifier(invalidIdentifier)).toBe(false);
    });
});