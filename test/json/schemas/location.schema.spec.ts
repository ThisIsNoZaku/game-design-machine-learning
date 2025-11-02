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
    it("allows a shape", () => {
        const valid = validator({
            shape: {
                rows: 5,
                cols: 10
            }
        });
        expect(valid, formatValidationErrors(validator.errors)).toBe(true);
    });
    it("allows a state", () => {
        const valid = validator({
            state: {
                foo: 5,
                bar: 10
            }
        });
        expect(valid, formatValidationErrors(validator.errors)).toBe(true);
    });
    it("allows tags", () => {
        const valid = validator({
            tags: []
        });
        expect(valid, formatValidationErrors(validator.errors)).toBe(true);
    });
    it("rejects tags that are not an array", () => {
        const valid = validator({
            tags: {}
        });
        expect(valid, formatValidationErrors(validator.errors)).toBe(false);
    });
});