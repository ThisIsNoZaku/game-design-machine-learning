import {ActionStep} from "./ActionStep";

class EffectActionStep extends ActionStep {
    get allowsMultipleChildren(): boolean {
        return false;
    }

}