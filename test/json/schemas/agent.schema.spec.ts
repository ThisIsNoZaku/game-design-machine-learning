import Ajv2020, { ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import agentSchema from "../../../src/json/schemas/agent.schema.json";
import formatValidationErrors from "../../../src/json/formatSchemaErrors";
import "jest-expect-message";

describe("Agent Schema", () => {
    let validateAgent: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        validateAgent = ajv.compile(agentSchema);
    });

    test("valid Agent object", () => {
        const validAgent = { id: "1"};
        expect(validateAgent(validAgent), formatValidationErrors(validateAgent.errors)).toBe(true);
    });
});
