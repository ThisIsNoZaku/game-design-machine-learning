export type TrainingLayerConfig = DenseLayerConfig;

export interface DenseLayerConfig {
    type: "dense";
    units: number;
    activation?: string;
    inputShape?: number[];
}

export interface TrainingModelConfig {
    type?: "sequential";
    inputShape?: number[];
    /**
     * Shape of the model output vector.
     * By convention, output[0] is the selected action id, and output[1..] map to action parameter values.
     */
    outputShape: number[];
    layers: TrainingLayerConfig[];
    optimizer: string;
    loss: string;
    metrics?: string[];
}
