import {GameDefinition} from "../../src/definitions/BaseGameDefinition";
import {GameState} from "../../src/state";
import act from "../../src/execution/act";
import {ActionDefinition} from "../../src/definitions/ActionDefinition";

describe('"Act function', () => {
    it("throws if the specified action does not exist on the game definition", () => {
        const game: GameDefinition = {
            metadata: {
                id: "",
                version: 1,
                name: ""
            },
            parameters: {},
            agents: {},
            locations: {},
            getInitialState: () => ({} as GameState),
            actions: []
        };
        const state : GameState = {} as GameState;

        expect(() => {
            act(game, state, {id: ""} as ActionDefinition, {});
        }).toThrow("Action '' not defined");
    })
    it("throws if the specified action parameters are missing a required parameter", () => {
        const game: GameDefinition = {
            metadata: {
                id: "",
                version: 1,
                name: ""
            },
            parameters: {},
            agents: {},
            locations: {},
            getInitialState: () => ({} as GameState),
            actions: [
                {
                    id: "",
                    parameters: {
                        foo: "string"
                    }
                } as any as ActionDefinition
            ]
        };
        const state : GameState = {} as GameState;

        expect(() => {
            act(game, state, {id: ""} as ActionDefinition, {});
        }).toThrow("Action execution parameters are missing required 'string' parameter 'foo'");
    });
    it("throws if the specified action parameter value is the wrong are missing a required parameter", () => {
        const game: GameDefinition = {
            metadata: {
                id: "",
                version: 1,
                name: ""
            },
            parameters: {},
            agents: {},
            locations: {},
            getInitialState: () => ({} as GameState),
            actions: [
                {
                    id: "",
                    parameters: {
                        foo: "string"
                    }
                } as any as ActionDefinition
            ]
        };
        const state : GameState = {} as GameState;

        expect(() => {
            act(game, state, {id: ""} as ActionDefinition, { foo: 1 });
        }).toThrow("Action execution parameter 'foo' is expected to be of type 'string', but was given a value of type 'number'");
    })
});