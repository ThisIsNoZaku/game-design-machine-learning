import { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { addSchemas, rule } from "../../../src/json/schemas";
import "jest-expect-message";
// @ts-ignore
import formatValidationErrors from "../../../src/json/formatSchemaErrors";

describe("Rule Schema", () => {
    let validateRule: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addSchemas(ajv);
        addFormats(ajv);
        validateRule = ajv.compile(rule);
    });

    test("valid Rule object", () => {
        const validRule = { };
        expect(validateRule(validRule), formatValidationErrors(validateRule.errors)).toBe(true);
    });
});