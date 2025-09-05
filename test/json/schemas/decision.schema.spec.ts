import Ajv2020, { ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import decisionSchema from "../../../src/json/schemas/decision.schema.json";
import {addSchemas} from "../../../src/json/schemas";

describe("Decision Schema", () => {
    let validateDecision: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        addSchemas(ajv);
        validateDecision = ajv.compile(decisionSchema);
    });

    test("valid Decision object", () => {
        const validDecision = {
            id: "decision1",
            label: "Choose an entity",
            min: 1,
            max: 3,
        };
        expect(validateDecision(validDecision)).toBe(true);
    });
});
