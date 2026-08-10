import {ActionStepDefinition, ExecutionContext} from "./ActionStepDefinition";

/**
 * Representation of the steps taken to resolve an action.
 *
 * Contains an ActionStep and zero or more child ActionResolutionTrees.
 *
 * The tree can be resolved by executing the ActionStep, then recursively resolving one of its child trees.
 *
 * If the ActionStep does not allow children, an error is thrown if any children are provided.
 */
export class ActionResolutionTree {
    actionStep: ActionStepDefinition;
    children: Array<ActionResolutionTree> = [];

    constructor(actionStep: ActionStepDefinition, children?: Array<ActionResolutionTree>) {
        this.actionStep = actionStep;
        if(!actionStep.allowsMultipleChildren && children && children.length > 1) {
            throw new Error("This ActionStep does not allow more than one child");

        }
        if (children) {
            this.children = children;
        }
    }

    canResolve(_context: ExecutionContext): boolean {
        return true;
    }

    /**
     * Apply this node's step to the context, then return the next child tree to resolve,
     * or null if resolution is complete.
     */
    resolve(context: ExecutionContext): ActionResolutionTree | null {
        this.actionStep.apply(context);
        return this.children.length > 0 ? this.children[0] : null;
    }
}