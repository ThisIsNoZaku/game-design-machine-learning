import { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { addSchemas, rule } from "../../../src/json/schemas";
import "jest-expect-message";
// @ts-ignore
import formatValidationErrors from "../../../src/json/schemas/formatSchemaErrors";

describe("Rule Schema", () => {
    let validateRule: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addSchemas(ajv);
        addFormats(ajv);
        validateRule = ajv.compile(rule);
    });

    test("valid Rule object", () => {
        const validRule = { id: "rule1" };
        expect(validateRule(validRule), formatValidationErrors(validateRule.errors)).toBe(true);
    });

    test("invalid Rule object (missing required property)", () => {
        const invalidRule = { id: "rule1", condition: "someCondition" };
        expect(validateRule(invalidRule)).toBe(false);
    });

    test("invalid Rule object (invalid property type)", () => {
        const invalidRule = { id: "rule1", condition: 123, effect: "someEffect" };
        expect(validateRule(invalidRule)).toBe(false);
    });
});