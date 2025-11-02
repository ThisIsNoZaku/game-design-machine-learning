import {ValidateFunction} from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import {addSchemas} from "../../../src/json/schemas";
import locationSchema from "../../../src/json/schemas/location.schema.json";
import "jest-expect-message";
import formatValidationErrors from "../../../src/json/formatSchemaErrors";

describe("location schema", () => {
    let validator: ValidateFunction;
    beforeAll(() => {
        const ajv = new Ajv2020({strict: false});
        addFormats(ajv);
        addSchemas(ajv);
        validator = ajv.compile(locationSchema);
    });
    it("must have an id", () => {
        const valid = validator({

        });
        expect(valid, formatValidationErrors(validator.errors)).toBe(true);
    })
});