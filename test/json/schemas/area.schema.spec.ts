import Ajv2020, {ValidateFunction} from "ajv/dist/2020";
import addFormats from "ajv-formats";
import areaSchema from "../../../src/json/schemas/location.schema.json";
import {addSchemas} from "../../../src/json/schemas";
import "jest-expect-message"
import formatValidationErrors from "../../../src/json/formatSchemaErrors";

describe("Area Schema", () => {
    let validateArea: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({allErrors: true});
        addFormats(ajv);
        addSchemas(ajv);
        validateArea = ajv.compile(areaSchema);
    });

    test("valid Area object", () => {
        const validArea = {
            shape: {rows: 3, cols: 3},
        };
        const validated = validateArea(validArea);
        expect(validated, formatValidationErrors(validateArea.errors)).toBe(true);
    });
});
