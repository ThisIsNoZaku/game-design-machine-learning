import {SerializedModelWeights} from "./TrainingWeights";

export interface TfAgentsAgentConfig {
    framework: "tf_agents";
    type: "reinforce";
    discountFactor?: number;
    batchSize?: number;
    epochs?: number;
    learningRate?: number;
}

export interface TorchRlAgentConfig {
    framework: "torchrl";
    type: "reinforce";
    discountFactor?: number;
    batchSize?: number;
    epochs?: number;
    learningRate?: number;
}

export type TrainingAgentConfig = TfAgentsAgentConfig | TorchRlAgentConfig;

export interface TrainingExecutionConfig {
    agentConfig?: TrainingAgentConfig;
    executionCount?: number;
    intermediateResultIncrement?: number;
    initialWeights?: SerializedModelWeights;
}
