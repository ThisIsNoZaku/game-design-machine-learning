import {ValidateFunction} from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import selectSchema from "../../../src/json/schemas/select.schema.json";
import formatValidationErrors from "../../../src/json/formatSchemaErrors";
import "jest-expect-message";
import expression from "../../../src/json/schemas/expression.schema.json";

describe("select schema", () => {
    let validator: ValidateFunction;
    beforeAll(() => {
        const ajv = new Ajv2020({allErrors: true});
        ajv.addSchema(expression, "expr.schema.json");
        addFormats(ajv);

        validator = ajv.compile(selectSchema);
    });
    describe("can select locations", () => {
        it("can define a location", () => {
            const locationSchema = {
                location: {}
            }

            expect(validator(locationSchema), formatValidationErrors(validator.errors)).toBe(true);
        });
    });
    describe("can select players", () => {
        it("can define a player", () => {
            const locationSchema = {
                player: {}
            }

            expect(validator(locationSchema), formatValidationErrors(validator.errors)).toBe(true);
        });
    });
    describe("can select entities", () => {
        it("can define an entity", () => {
            const locationSchema = {
                entity: {}
            }

            expect(validator(locationSchema), formatValidationErrors(validator.errors)).toBe(true);
        });
    });
})