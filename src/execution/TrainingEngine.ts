import {GameDefinition} from "../definitions/BaseGameDefinition";
import {GameModel} from "./GameModel";
import {TrainingModelConfig} from "./TrainingModelConfig";
import * as path from "node:path";
import {GameState} from "../state";
import act from "./act";
import {HarnessResponse, TrainingHarnessClient} from "./TrainingHarnessClient";
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

    constructor(
        game: GameDefinition,
        state: GameState,
        private readonly options: TrainingEngineOptions = {}
    ) {
        this.game = game;
        this.state = state;
    }

    async train(definition:D, modelConfig: TrainingModelConfig, model?: M): Promise<TrainingResult> {
        void model;
        const harnessHost = this.options.host ?? "127.0.0.1";
        const timeoutMs = this.options.timeoutMs ?? 120000;
        const harnessPath = this.options.harnessPath ?? path.resolve(process.cwd(), "src", "execution", "sidecars", "harness.py");
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
            const initialization = await harnessClient.buildModel(modelConfig);
            console.info("Received response from Harness server");
            this.forwardHarnessLogs(initialization.logs);
            this.throwOnHarnessFailure(initialization, "Unknown training failure");

            if (initialization.result && typeof initialization.result === "object" && "modelJson" in initialization.result) {
                const modelMetadata = initialization.result as {modelJson?: unknown};
                console.debug(`Resulting model: ${JSON.stringify(modelMetadata.modelJson)}`);
            }

            let loop  = 0;
            while(!this.state.terminated) {
                loop++;
                console.log(`Executing loop ${loop}`);
                const observation = this.game.getObservation(this.state, this.state.players.active);
                if(!observation) {
                    throw new Error("Got a falsey state observation");
                }
                const predictionResponse = await harnessClient.predict(spec.encode(observation) as number[]);
                this.forwardHarnessLogs(predictionResponse.logs);
                this.throwOnHarnessFailure(predictionResponse, "Harness prediction request failed");
                this.applyHarnessPrediction(predictionResponse.result);
            }

            return {
                finalState: this.state
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

    private applyHarnessPrediction(result: unknown): void {
        const prediction = this.extractPredictionVector(result);
        const selection = this.game.resolveActionSelection(this.state, prediction);
        act(this.game, this.state, selection.action, selection.parameters);
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
}

export interface TrainingResult {
    finalState: GameState;
}
