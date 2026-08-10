/**
 * Represents a step in an action.
 *
 * A step consists of the following:
 * - zero or more prerequisites that must be met for the step to be executed. If they are not met, the step cannot be executed.
 *
 * Steps can be either Effect, Branch or Decision steps.
 *
 * In an Effect step, the step is executed and the effects are applied to the world state. This occurs automatically when the step is reached. Effect steps may have zero or one further steps.
 *
 * In a Branch step, the step is reached and the next step will be determined automatically based on the current world state.
 *
 * In a Decision step, an actor will make a decision about which sub-step to take next.
 */
import {GameDefinition} from "./BaseGameDefinition";
import {GameState} from "../state";
import {RegionId} from "./Region";

export type ExecutionContext = {
    game: GameDefinition;
    state: GameState;
    parameters: Record<string, string | number | RegionId>;
};

export abstract class ActionStepDefinition {
    public abstract get allowsMultipleChildren(): boolean;

    /**
     * Apply this step's effects to the game state.
     */
    public abstract apply(context: ExecutionContext): void;
}