import Ajv, { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import triggerSchema from "../../../src/json/schemas/trigger.schema.json";
import {addSchemas} from "../../../src/json/schemas";
import formatValidationErrors from "../../../src/json/schemas/formatSchemaErrors";
import "jest-expect-message";

describe("Trigger Schema", () => {
    let validateTrigger: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        addSchemas(ajv)
        validateTrigger = ajv.compile(triggerSchema);
    });

    test("valid Trigger object", () => {
        const validTrigger = { };
        expect(validateTrigger(validTrigger), formatValidationErrors(validateTrigger.errors)).toBe(true);
    });
});