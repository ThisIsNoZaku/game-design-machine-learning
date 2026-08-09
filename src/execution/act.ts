import {GameDefinition} from "../definitions/BaseGameDefinition";
import {GameState} from "../state";
import {ActionDefinition} from "../definitions/ActionDefinition";

export default function act(game: GameDefinition, state: GameState, action: Action): GameState {
    const expectedAction = game.actions.find(i => i.id === action.action.id);
    if(!expectedAction) {
        throw new Error(`Action '${action.action.id}' not defined`);
    }
    for(let parameter in expectedAction.parameters) {
        if(!(parameter in action.parameters)) {
            throw new Error(`Action execution parameters are missing required '${expectedAction.parameters[parameter]}' parameter '${parameter}'`);
        }
        if(typeof action.parameters[parameter] !== expectedAction.parameters[parameter]) {
            throw new Error(`Action execution parameter '${parameter}' is expected to be of type '${expectedAction.parameters[parameter]}', but was given a value of type '${typeof action.parameters[parameter]}'`);
        }
    }
    return state;
}

export interface Action {
    action: ActionDefinition;
    actor: string;
    parameters: Record<string, any>;
}