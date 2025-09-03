import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import entitySchema from "../../../src/json/schemas/entity.schema.json";

describe("Entity Schema", () => {
let validateEntity: ValidateFunction;

beforeAll(() => {
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
validateEntity = ajv.compile(entitySchema);
});

test("valid Entity object", () => {
const validEntity = { id: "entity1", archetype: "card1", area: "area1" };
expect(validateEntity(validEntity)).toBe(true);
});

test("invalid Entity object (missing required property)", () => {
const invalidEntity = { id: "entity1", archetype: "card1" };
expect(validateEntity(invalidEntity)).toBe(false);
});

test("invalid Entity object (invalid area type)", () => {
const invalidEntity = { id: "entity1", archetype: "card1", area: 123 };
expect(validateEntity(invalidEntity)).toBe(false);
});
});