import {GameDefinition} from "../definitions/BaseGameDefinition";
import {GameModel} from "./GameModel";
import {TrainingExecutionConfig} from "./TrainingExecutionConfig";
import {TrainingModelConfig} from "./TrainingModelConfig";
import {SerializedModelWeights} from "./TrainingWeights";
import * as path from "node:path";
import {GameState} from "../state";
import act from "./act";
import {HarnessResponse, TrainingHarnessClient, TrainingTransition} from "./TrainingHarnessClient";
import LocalProcessTrainingHarnessClient from "./LocalProcessTrainingHarnessClient";

export interface TrainingEngineOptions {
    pythonExecutable?: string;
    harnessPath?: string;
    host?: string;
    timeoutMs?: number;
    onHarnessLog?: (message: string) => void;
    harnessClient?: TrainingHarnessClient;
}

export default class TrainingEngine<D extends GameDefinition, M extends GameModel> {
    private readonly game: GameDefinition;
    private readonly state: GameState;
    private readonly initialStateSnapshot: GameState;

    constructor(
        game: GameDefinition,
        state: GameState,
        private readonly options: TrainingEngineOptions = {}
    ) {
        this.game = game;
        this.state = state;
        this.initialStateSnapshot = structuredClone(state);
    }

    async train(
        definition:D,
        modelConfig: TrainingModelConfig,
        executionConfig: TrainingExecutionConfig
    ): Promise<TrainingResult> {
        void ({} as M | undefined);
        const resolvedExecutionConfig = this.normalizeExecutionConfig(executionConfig);
        const harnessHost = this.options.host ?? "127.0.0.1";
        const timeoutMs = this.options.timeoutMs ?? 120000;
        const harnessPath = this.options.harnessPath ?? path.resolve(process.cwd(), "src", "execution", "sidecars", "harness_torch.py");
        const pythonExecutable = this.normalizePythonExecutable(this.options.pythonExecutable ?? "python");
        const harnessClient = this.options.harnessClient ?? new LocalProcessTrainingHarnessClient({
            pythonExecutable,
            harnessPath,
            host: harnessHost,
            timeoutMs
        });
        const spec = await definition.spec();

        try {
            console.info("Sending model configuration to Harness server");
            const initialization = await harnessClient.buildModel(modelConfig, resolvedExecutionConfig);
            console.info("Received response from Harness server");
            this.forwardHarnessLogs(initialization.logs);
            this.throwOnHarnessFailure(initialization, "Unknown training failure");

            if (initialization.result && typeof initialization.result === "object" && "modelJson" in initialization.result) {
                const modelMetadata = initialization.result as {modelJson?: unknown};
                console.debug(`Resulting model: ${JSON.stringify(modelMetadata.modelJson)}`);
            }

            const transitions: TrainingTransition[] = [];
            const intermediateResults: IntermediateTrainingResult[] = [];
            for (let executionIndex = 0; executionIndex < resolvedExecutionConfig.executionCount; executionIndex++) {
                if (executionIndex > 0) {
                    this.resetState();
                }
                await this.executeTrainingRun(spec, harnessClient, transitions);

                const completedExecutions = executionIndex + 1;
                if (this.shouldCaptureIntermediateResult(completedExecutions, resolvedExecutionConfig)) {
                    const weights = await this.completeTrainingBatch(
                        harnessClient,
                        transitions,
                        "Harness intermediate training completion failed"
                    );
                    intermediateResults.push({completedExecutions, weights});
                    transitions.length = 0;
                }
            }

            const weights = await this.completeTrainingBatch(
                harnessClient,
                transitions,
                "Harness training completion failed"
            );

            return {
                finalState: this.state,
                weights,
                ...(intermediateResults.length > 0 ? {intermediateResults} : {})
            };
        } finally {
            await harnessClient.close();
        }
    }

    private normalizePythonExecutable(pythonExecutable: string): string {
        if (process.platform !== "win32") {
            return pythonExecutable;
        }

        const unixDrivePath = pythonExecutable.match(/^\/([a-zA-Z])\/(.*)$/);
        const normalized = unixDrivePath
            ? `${unixDrivePath[1].toUpperCase()}:\\${unixDrivePath[2].replace(/\//g, "\\")}`
            : pythonExecutable;

        if (/^[a-zA-Z]:\\/.test(normalized) && path.win32.extname(normalized) === "") {
            return `${normalized}.exe`;
        }

        return normalized;
    }

    private forwardHarnessLogs(logs?: unknown): void {
        if (!Array.isArray(logs)) {
            return;
        }

        for (const entry of logs) {
            if (typeof entry !== "string" || !entry) {
                continue;
            }
            if (this.options.onHarnessLog) {
                this.options.onHarnessLog(entry);
            } else {
                console.log(`[training-harness] ${entry}`);
            }
        }
    }

    private throwOnHarnessFailure(response: HarnessResponse, fallbackMessage: string): void {
        if (response.ok) {
            return;
        }
        const message = typeof response.error === "string" ? response.error : fallbackMessage;
        throw new Error(message);
    }

    private extractPredictionVector(result: unknown): number[] {
        if (!Array.isArray(result)) {
            throw new Error(`Harness returned an invalid prediction payload: ${JSON.stringify(result)}`);
        }

        const rawVector = (
            result.length === 1 && Array.isArray(result[0])
                ? result[0]
                : result
        ) as unknown[];
        if (!Array.isArray(rawVector) || rawVector.length === 0) {
            throw new Error(`Harness returned an empty prediction vector: ${JSON.stringify(result)}`);
        }

        const vector: number[] = [];
        for (const value of rawVector) {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
                throw new Error(`Harness returned a non-numeric prediction value: ${JSON.stringify(value)}`);
            }
            vector.push(numericValue);
        }
        return vector;
    }

    private resolveHarnessPrediction(prediction: number[]) {
        return this.game.resolveActionSelection(this.state, prediction);
    }

    private getActionIndex(actionId: string): number {
        const actionIndex = this.game.actions.findIndex(candidate => candidate.id === actionId);
        if (actionIndex < 0) {
            throw new Error(`Resolved action '${actionId}' is not defined on the game`);
        }
        return actionIndex;
    }

    private calculateReward(actorId: string, state: GameState): number {
        if (!state.terminated) {
            return 0;
        }
        if (state.winners.includes(actorId)) {
            return 1;
        }
        if (state.winners.length === 0) {
            return 0;
        }
        return -1;
    }

    private toNumericVector(value: unknown, fieldName: string): number[] {
        if (!Array.isArray(value)) {
            throw new Error(`Expected ${fieldName} to be an array, got ${JSON.stringify(value)}`);
        }

        const vector: number[] = [];
        const append = (entry: unknown): void => {
            if (Array.isArray(entry)) {
                for (const nested of entry) {
                    append(nested);
                }
                return;
            }

            const numericValue = Number(entry);
            if (!Number.isFinite(numericValue)) {
                throw new Error(`Expected ${fieldName} to contain only numeric values, got ${JSON.stringify(entry)}`);
            }
            vector.push(numericValue);
        };

        for (const entry of value) {
            append(entry);
        }
        return vector;
    }

    private extractSerializedWeights(result: unknown): SerializedModelWeights | undefined {
        if (!result || typeof result !== "object" || !("weights" in result)) {
            return undefined;
        }
        return (result as {weights?: SerializedModelWeights}).weights;
    }

    private normalizeExecutionConfig(
        executionConfig: TrainingExecutionConfig
    ): Required<Pick<TrainingExecutionConfig, "executionCount" | "intermediateResultIncrement">> & TrainingExecutionConfig {
        if (!executionConfig || typeof executionConfig !== "object") {
            throw new Error("Training execution config must be an object");
        }

        if (executionConfig.initialWeights !== undefined && !Array.isArray(executionConfig.initialWeights)) {
            throw new Error("Training execution config initialWeights must be an array when provided");
        }

        const executionCount = executionConfig.executionCount ?? 1;
        if (!Number.isInteger(executionCount) || executionCount <= 0) {
            throw new Error("Training execution config executionCount must be a positive integer");
        }

        const intermediateResultIncrement = executionConfig.intermediateResultIncrement ?? 0;
        if (!Number.isInteger(intermediateResultIncrement) || intermediateResultIncrement < 0) {
            throw new Error("Training execution config intermediateResultIncrement must be a non-negative integer");
        }

        return {
            ...executionConfig,
            executionCount,
            intermediateResultIncrement
        };
    }

    private shouldCaptureIntermediateResult(
        completedExecutions: number,
        executionConfig: Required<Pick<TrainingExecutionConfig, "executionCount" | "intermediateResultIncrement">> & TrainingExecutionConfig
    ): boolean {
        return executionConfig.intermediateResultIncrement > 0
            && completedExecutions < executionConfig.executionCount
            && completedExecutions % executionConfig.intermediateResultIncrement === 0;
    }

    private async completeTrainingBatch(
        harnessClient: TrainingHarnessClient,
        transitions: TrainingTransition[],
        failureMessage: string
    ): Promise<SerializedModelWeights | undefined> {
        const completion = await harnessClient.completeTraining(transitions);
        this.forwardHarnessLogs(completion.logs);
        this.throwOnHarnessFailure(completion, failureMessage);
        return this.extractSerializedWeights(completion.result);
    }

    private async executeTrainingRun(
        spec: Awaited<ReturnType<GameDefinition["spec"]>>,
        harnessClient: TrainingHarnessClient,
        transitions: TrainingTransition[]
    ): Promise<void> {
        let loop = 0;
        while (!this.state.terminated) {
            loop++;
            console.log(`Executing loop ${loop}`);
            const observation = this.game.getObservation(this.state, this.state.players.active);
            if (!observation) {
                throw new Error("Got a falsey state observation");
            }
            const encodedObservation = this.toNumericVector(spec.encode(observation), "observation");
            const actorId = this.state.players.active;
            const predictionResponse = await harnessClient.predict(encodedObservation);
            this.forwardHarnessLogs(predictionResponse.logs);
            this.throwOnHarnessFailure(predictionResponse, "Harness prediction request failed");
            const prediction = this.extractPredictionVector(predictionResponse.result);
            const selection = this.resolveHarnessPrediction(prediction);
            const actionIndex = this.getActionIndex(selection.action.id);
            act(this.game, this.state, selection.action, selection.parameters);

            const nextObservation = this.state.terminated
                ? encodedObservation
                : this.toNumericVector(
                    spec.encode(this.game.getObservation(this.state, this.state.players.active)),
                    "next observation"
                );
            transitions.push({
                observation: encodedObservation,
                policyOutput: prediction,
                actionIndex,
                reward: this.calculateReward(actorId, this.state),
                nextObservation,
                isTerminal: this.state.terminated
            });
        }
    }

    private resetState(): void {
        const freshState = structuredClone(this.initialStateSnapshot) as GameState;
        const target = this.state as unknown as Record<string, unknown>;
        for (const key of Object.keys(target)) {
            delete target[key];
        }
        Object.assign(target, freshState as unknown as Record<string, unknown>);
    }
}

export interface TrainingResult {
    finalState: GameState;
    weights?: SerializedModelWeights;
    intermediateResults?: IntermediateTrainingResult[];
}

export interface IntermediateTrainingResult {
    completedExecutions: number;
    weights?: SerializedModelWeights;
}
