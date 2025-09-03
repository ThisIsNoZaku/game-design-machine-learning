import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import agentSchema from "../../../src/json/schemas/agent.schema.json";

describe("Agent Schema", () => {
    let validateAgent: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv({ allErrors: true });
        addFormats(ajv);
        validateAgent = ajv.compile(agentSchema);
    });

    test("valid Agent object", () => {
        const validAgent = { id: "agent1", kind: "human", seats: 2 };
        expect(validateAgent(validAgent)).toBe(true);
    });

    test("invalid Agent object (missing required property)", () => {
        const invalidAgent = { kind: "human" };
        expect(validateAgent(invalidAgent)).toBe(false);
    });

    test("invalid Agent object (invalid enum value)", () => {
        const invalidAgent = { id: "agent1", kind: "alien" };
        expect(validateAgent(invalidAgent)).toBe(false);
    });
});