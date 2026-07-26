import {ActionResolutionTree} from "./ActionResolutionTree";
import {All, Any} from "../Composites";
import {AgentDefinition} from "./AgentDefinition";

/**
 * An action that an Agent can perform in the rules.
 *
 * An action consists of:
 * - zero or more preconditions that must be met for the action to be available.
 * - zero or more steps that are executed to resolve the action.
 * - zero or more parameters that specify variables that modify the action.
 *
 * When all preconditions are met, canPerform() returns true.
 * The action is then begun by calling perform(), which will return a list of all steps that occur as part of the Action.
 *
 * Action steps are organized as a tree, where each step may have zero or more sub-steps.
 */
export class ActionDefinition {
    id: string;
    label?: string;
    actor: string;
    prerequisites?: Any | All;
    steps: ActionResolutionTree;
    // Metadata about an action to guide Agent decisions
    tags?: Array<string>;
    /**
     *
     */
    parameters?: Record<string, string | number | boolean>;

    constructor(
        id: string,
        actor: string,
        steps: ActionResolutionTree,
        label?: string,
        pre?: Any | All,
        tags?: Array<string>,
        parameters?: Record<string, string | number | boolean>
    ) {
        this.id = id;
        this.actor = actor;
        this.steps = steps;
        this.label = label;
        this.prerequisites = pre;
        this.tags = tags || [];
        this.parameters = parameters || {};
    }

    canPerform(actor: AgentDefinition) {
        return false;
    }
}