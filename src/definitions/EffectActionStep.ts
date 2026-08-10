import {ActionStepDefinition, ExecutionContext} from "./ActionStepDefinition";

export class EffectActionStep extends ActionStepDefinition {
    get allowsMultipleChildren(): boolean {
        return false;
    }

    apply(_context: ExecutionContext): void {
        // Effect application is handled by subclasses that define specific effects
    }
}