import {ActionStep} from "./ActionStep";

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
    actionStep: ActionStep;
    children: Array<ActionResolutionTree> = [];

    constructor(actionStep: ActionStep, children?: Array<ActionResolutionTree>) {
        this.actionStep = actionStep;
        if(!actionStep.allowsMultipleChildren && children && children.length > 1) {
            throw new Error("This ActionStep does not allow more than one child");

        }
        if (children) {
            this.children = children;
        }
    }

    canResolve(context: any): boolean {
        return false;
    }

    /**
     * Resolve the action step at the root of this tree. Then, based on the result of that step, return one of the
     * children to resolve further.
     * @param context
     */
    resolve(context: any): ActionResolutionTree | null {
        return null;
    }
}