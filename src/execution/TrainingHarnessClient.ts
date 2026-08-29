import {TrainingExecutionConfig} from "./TrainingExecutionConfig";
import {TrainingModelConfig} from "./TrainingModelConfig";

export interface HarnessResponse {
    ok: boolean;
    result?: unknown;
    error?: unknown;
    logs?: unknown;
}

export interface TrainingTransition {
    observation: number[];
    policyOutput: number[];
    actionIndex: number;
    reward: number;
    nextObservation: number[];
    isTerminal: boolean;
}

export interface TrainingHarnessClient {
    buildModel(modelConfig: TrainingModelConfig, executionConfig: TrainingExecutionConfig): Promise<HarnessResponse>;
    predict(observation: number[]): Promise<HarnessResponse>;
    completeTraining(transitions: TrainingTransition[]): Promise<HarnessResponse>;
    close(): Promise<void>;
}
