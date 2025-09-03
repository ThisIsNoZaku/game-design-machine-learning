import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import expressionSchema from "../../../src/json/schemas/expression.schema.json";

describe("Expression Schema", () => {
    let validateExpression: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateExpression = ajv.compile(expressionSchema);
    });

    test("valid Expression object", () => {
        const validExpression = { type: "binary", operator: "+", left: 1, right: 2 };
        expect(validateExpression(validExpression)).toBe(true);
    });

    test("invalid Expression object (missing required property)", () => {
        const invalidExpression = { type: "binary", operator: "+" };
        expect(validateExpression(invalidExpression)).toBe(false);
    });

    test("invalid Expression object (invalid operator)", () => {
        const invalidExpression = { type: "binary", operator: "invalid", left: 1, right: 2 };
        expect(validateExpression(invalidExpression)).toBe(false);
    });
});