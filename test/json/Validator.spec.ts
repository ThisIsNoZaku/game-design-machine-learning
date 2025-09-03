import { RuleDocumentValidator } from "../../src/json/RuleDocumentValidator";

describe("JsonValidator with RuleSchema", () => {
    let validator: RuleDocumentValidator;

    beforeAll(() => {
        validator = new RuleDocumentValidator();
    });
    test("validate should return true for a valid JSON object", () => {
        const input = {
            "metadata": {
                "id": "game1",
                "name": "Example Game",
                "version": 1,
                "description": "A sample board game schema.",
                "tags": ["strategy", "multiplayer"]
            },
            "parameters": {
                "maxPlayers": 4,
                "difficulty": "medium",
                "allowSpectators": true
            },
            "rng": {
                "sides": 6,
                "count": 2
            },
            "agents": [
                {
                    "id": "agent1",
                    "kind": "human",
                    "seats": 1
                }
            ],
            "areas": [
                {
                    "id": "area1",
                    "name": "Starting Zone",
                    "type": "zone"
                }
            ],
            "entities": [
                {
                    "id": "entity1",
                    "archetype": "card1",
                    "area": "area1"
                }
            ],
            "phases": [
                {
                    "id": "phase1",
                    "label": "Setup Phase"
                }
            ],
            "actions": [
                {
                    "id": "action1",
                    "type": "move",
                    "label": "Move Action"
                }
            ],
            "rules": [
                {
                    "id": "rule1",
                    "condition": "someCondition",
                    "effect": "someEffect"
                }
            ]
        }
        expect(validator.validate(input)).toBe(true);
    });

    // test("validate should return false for an invalid JSON object", () => {
    //     const invalidJsonObject = { name: "John" }; // Missing "age"
    //     expect(validator.validate(invalidJsonObject)).toBe(false);
    // });
    //
    // test("validate should return true for a valid JSON string", () => {
    //     const validJsonString = JSON.stringify({ name: "John", age: 30 });
    //     expect(validator.validate(validJsonString)).toBe(true);
    // });
    //
    // test("validate should return false for an invalid JSON string", () => {
    //     const invalidJsonString = JSON.stringify({ name: "John" }); // Missing "age"
    //     expect(validator.validate(invalidJsonString)).toBe(false);
    // });
    //
    // test("validate should throw an error for an invalid JSON string format", () => {
    //     const invalidJsonString = "{ name: John, age: 30 }"; // Invalid JSON format
    //     expect(() => validator.validate(invalidJsonString)).toThrow(SyntaxError);
    // });

});