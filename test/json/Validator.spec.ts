import {RuleDocumentValidator} from "../../src/json/RuleDocumentValidator";

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
            "agents": {
                "count": {
                    "min": 2,
                    "max": 4
                }
            }
            ,
            "locations": [
                {
                    "id": "area1",
                    "name": "Starting Zone",
                    "type": "zone"
                }
            ],
            "entityTypes": [
                {
                    "id": "entity1",
                    "archetype": "card1",
                    "area": "area1"
                }
            ],
            "phases": {
                "initial": "phase1",
                "nodes": {
                    "phase1": {
                        "id": "phase1",
                        "label": "Setup Phase"
                    }
                }
            },
            "actions": [
                {
                    "id": "action1",
                    "type": "move",
                    "label": "Move Action",
                    "actor": "active",
                    "decisions": []
                }
            ],
            "rules": {
                "rule1": {
                    "constrains": {
                        "entity": {
                            "foo": "bar"
                        }
                    }
                }
            }
        }
        expect(validator.validate(input)).toBeTruthy();
    });

    test("validate should return true for a valid JSON string", () => {
        const input = `{
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
            "agents": {
                "count" : {
                    "min": 2,
                    "max": 4
                }
            },
            "locations": [
                {
                    "id": "area1",
                    "name": "Starting Zone",
                    "type": "zone"
                }
            ],
            "entityTypes": [
                {
                    "id": "entity1",
                    "archetype": "card1",
                    "area": "area1"
                }
            ],
            "phases": {
                "initial" : "phase1",
                "nodes" : {
                    "phase1": {
                        "id": "phase1",
                        "label": "Setup Phase"
                    }
                }
            },
            "actions": [
                {
                    "id": "action1",
                    "type": "move",
                    "label": "Move Action",
                    "actor" : "active",
                    "decisions" : []
                }
            ],
            "rules": {
                "rule1" : {
                    "constrains" : {
                        "entity": { 
                            "foo":"bar"
                        }
                    }
                }
            }
        }`;
        expect(validator.validate(input)).toBeTruthy();
    });

    test("validate should throw an error for a non-string, non-object argument", () => {
        expect(() => validator.validate(42 as any)).toThrow("Input must be a string or an object");
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