import Ajv2020, { ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import entitySchema from "../../../src/json/schemas/entity.schema.json";
import formatValidationErrors from "../../../src/json/schemas/formatSchemaErrors";

describe("Entity Schema", () => {
    let validateEntity: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        validateEntity = ajv.compile(entitySchema);
    });

    test("valid Entity object", () => {
        const validEntity = { id: "entity1", archetype: "card1", area: "area1" };
        expect(validateEntity(validEntity), formatValidationErrors(validateEntity.errors)).toBe(true);
    });
});
