import Ajv2020, { ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import phaseNodeSchema from "../../../src/json/schemas/phaseNode.schema.json";
import {addSchemas} from "../../../src/json/schemas";

describe("PhaseNode Schema", () => {
    let validatePhaseNode: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        addSchemas(ajv);
        validatePhaseNode = ajv.compile(phaseNodeSchema);
    });

    test("valid PhaseNode object", () => {
        const validPhaseNode = {
            id: "phase1",
            label: "Start Phase",
            enabledActions: ["action1", "action2"],
            onEnter: [],
            onExit: [],
            transitions: [],
        };
        expect(validatePhaseNode(validPhaseNode)).toBe(true);
    });

    test("invalid PhaseNode object (missing required property)", () => {
        const invalidPhaseNode = { label: "Start Phase" };
        expect(validatePhaseNode(invalidPhaseNode)).toBe(false);
    });

    test("invalid PhaseNode object (invalid nested transition)", () => {
        const invalidPhaseNode = {
            id: "phase1",
            transitions: [{ invalidProperty: "value" }],
        };
        expect(validatePhaseNode(invalidPhaseNode)).toBe(false);
    });
});
