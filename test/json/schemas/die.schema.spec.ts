import Ajv2020, { ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import dieSchema from "../../../src/json/schemas/die.schema.json";
import formatValidationErrors from "../../../src/json/schemas/formatSchemaErrors";

describe("Die Schema", () => {
    let validateDie: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        validateDie = ajv.compile(dieSchema);
    });

    test("valid Die object", () => {
        const validDie = { id: "d6", sides: [1,2,3,4,5,6]};
        expect(validateDie(validDie), formatValidationErrors(validateDie.errors)).toBe(true);
    });
});
