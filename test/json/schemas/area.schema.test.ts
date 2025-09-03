import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import areaSchema from "../../../src/json/schemas/area.schema.json";

describe("Area Schema", () => {
    let validateArea: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateArea = ajv.compile(areaSchema);
    });

    test("valid Area object", () => {
        const validArea = {
            id: "area1",
            kind: "board",
            name: "Main Board",
            shape: { rows: 3, cols: 3, adjacency: "orth" },
        };
        expect(validateArea(validArea)).toBe(true);
    });

    test("invalid Area object (missing required property)", () => {
        const invalidArea = { kind: "board" };
        expect(validateArea(invalidArea)).toBe(false);
    });

    test("invalid Area object (invalid enum value)", () => {
        const invalidArea = { id: "area1", kind: "invalidKind" };
        expect(validateArea(invalidArea)).toBe(false);
    });
});