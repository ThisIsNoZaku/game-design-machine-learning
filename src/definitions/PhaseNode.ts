import {Effect} from "./Effect";
import {Transition} from "./Transition";

export class PhaseNode {
    id: string;
    label?: string;
    enabledActions?: string[];
    onEnter?: Effect[];
    onExit?: Effect[];
    transitions?: Transition[];

    constructor(
        id: string,
        label?: string,
        enabledActions?: string[],
        onEnter?: Effect[],
        onExit?: Effect[],
        transitions?: Transition[]
    ) {
        this.id = id;
        this.label = label;
        this.enabledActions = enabledActions;
        this.onEnter = onEnter;
        this.onExit = onExit;
        this.transitions = transitions;
    }
}