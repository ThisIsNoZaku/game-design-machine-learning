import {GameDefinition} from "../definitions/BaseGameDefinition";
import {GameState} from "../state";
import {ActionDefinition} from "../definitions/ActionDefinition";
import {RegionId} from "../definitions/RegionDefinition";

export default function act(game: GameDefinition, state: GameState, action: ActionDefinition, parameters: Record<string, string | number | boolean | RegionId>): GameState {
    const expectedAction = game.actions.find(i => i.id === action.id);
    if(!expectedAction) {
        throw new Error(`Action '${action.id}' not defined`);
    }
    for(let parameter in expectedAction.parameters) {
        if(!(parameter in parameters)) {
            throw new Error(`Action execution parameters are missing required '${expectedAction.parameters[parameter]}' parameter '${parameter}'`);
        }
        if(typeof parameters[parameter] !== expectedAction.parameters[parameter]) {
            throw new Error(`Action execution parameter '${parameter}' is expected to be of type '${expectedAction.parameters[parameter]}', but was given a value of type '${typeof parameters[parameter]}'`);
        }
    }

    action.execute(game, state, parameters);
    return state;
}