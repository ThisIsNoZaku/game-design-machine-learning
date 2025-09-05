import Ajv2020, { ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import areaSchema from "../../../src/json/schemas/location.schema.json";
import {addSchemas} from "../../../src/json/schemas";

describe("Area Schema", () => {
    let validateArea: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        addSchemas(ajv);
        validateArea = ajv.compile(areaSchema);
    });

    test("valid Area object", () => {
        const validArea = {
            id: "area1",
            name: "Main Board",
            shape: { rows: 3, cols: 3, adjacency: "orth" },
        };
        expect(validateArea(validArea)).toBe(true);
    });
});
