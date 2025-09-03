import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import ruleSchema from "../../../src/json/schemas/rule.schema.json";

describe("Rule Schema", () => {
    let validateRule: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateRule = ajv.compile(ruleSchema);
    });

    test("valid Rule object", () => {
        const validRule = { id: "rule1", condition: "someCondition", effect: "someEffect" };
        expect(validateRule(validRule)).toBe(true);
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