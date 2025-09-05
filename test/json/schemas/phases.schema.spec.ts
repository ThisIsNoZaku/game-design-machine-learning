import { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import phasesSchema from "../../../src/json/schemas/phases.schema.json";
import {addSchemas} from "../../../src/json/schemas";
import formatValidationErrors from "../../../src/json/formatSchemaErrors";
import "jest-expect-message";

describe("Phases Schema", () => {
    let validatePhases: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        addSchemas(ajv);
        validatePhases = ajv.compile(phasesSchema);
    });

    test("valid Phases object", () => {
        const validPhases = { initial: "one", nodes: {} };
        expect(validatePhases(validPhases), formatValidationErrors(validatePhases.errors)).toBe(true);
    });
});