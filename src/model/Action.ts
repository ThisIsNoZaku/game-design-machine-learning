import {ActionResolutionTree} from "./ActionResolutionTree";

/**
 * An action that an Actor can perform in the rules.
 *
 * An action consists of:
 * - zero or more preconditions that must be met for the action to be available.
 * - zero or more steps that are executed to resolve the action.
 *
 * When all preconditions are met, canPerform() returns true.
 * The action is then begun by calling perform(), which will return a list of all steps that occur as part of the Action.
 *
 * Action steps are organized as a tree, where each step may have zero or more sub-steps.
 */
class Action {
    id: string;
    label?: string;
    actor: string;
    prerequisites?: Array<object>;
    steps: ActionResolutionTree;
    // Metadata about an action to guide Agent decisions
    tags?: Array<string>;

    constructor(
        id: string,
        actor: string,
        steps: ActionResolutionTree,
        label?: string,
        pre?: Array<object>,
        tags?: Array<string>
    ) {
        this.id = id;
        this.actor = actor;
        this.steps = steps;
        this.label = label;
        this.prerequisites = pre;
        this.tags = tags;
    }

    canPerform(actor: Agent) {
        return false;
    }
}