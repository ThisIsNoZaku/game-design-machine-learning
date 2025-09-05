import { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import transitionSchema from "../../../src/json/schemas/transition.schema.json";
import {addSchemas} from "../../../src/json/schemas";
import formatValidationErrors from "../../../src/json/formatSchemaErrors";
import "jest-expect-message"

describe("Transition Schema", () => {
    let validateTransition: ValidateFunction;

    beforeAll(() => {
        const ajv = new Ajv2020({ allErrors: true });
        addFormats(ajv);
        addSchemas(ajv);
        validateTransition = ajv.compile(transitionSchema);
    });

    test("valid Transition object", () => {
        const validTransition = { from: ["phase1"], to: "phase2", trigger: {"expr" : "someCondition"}};
        expect(validateTransition(validTransition), formatValidationErrors(validateTransition.errors)).toBe(true);
    });
});