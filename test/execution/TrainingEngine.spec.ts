import TrainingEngine from "../../src/execution/TrainingEngine";
import {TrainingExecutionConfig} from "../../src/execution/TrainingExecutionConfig";
import {GameDefinition} from "../../src/definitions/BaseGameDefinition";
import {TrainingModelConfig} from "../../src/execution/TrainingModelConfig";
import {GameState} from "../../src/state";
import {TrainingHarnessClient} from "../../src/execution/TrainingHarnessClient";

describe("TrainingEngine", () => {
    const modelConfig: TrainingModelConfig = {
        type: "sequential",
        inputShape: [3],
        outputShape: [2],
        layers: [
            {type: "dense", units: 8, activation: "relu"},
            {type: "dense", units: 2}
        ],
        optimizer: "adam",
        loss: "binary_crossentropy",
        metrics: ["accuracy"]
    };
    const executionConfig: TrainingExecutionConfig = {executionCount: 1, intermediateResultIncrement: 0};

    const createHarnessClient = (): jest.Mocked<TrainingHarnessClient> => ({
        buildModel: jest.fn(),
        predict: jest.fn(),
        completeTraining: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined)
    });

    it("uses the harness interface to build the model and returns final state", async () => {
        const harnessClient = createHarnessClient();
        harnessClient.buildModel.mockResolvedValue({
            ok: true,
            result: {modelJson: {class_name: "Sequential"}},
            logs: ["building model", "training complete"]
        });
        harnessClient.completeTraining.mockResolvedValue({
            ok: true,
            result: {weights: [[[1, 2]]]}
        });
        const onHarnessLog = jest.fn();

        const state = {terminated: true} as GameState;
        const definition = {
            spec: async () => ({fields: [], encode: () => []}),
            resolveActionSelection: jest.fn()
        } as unknown as GameDefinition;
        const engine = new TrainingEngine(definition, state, {harnessClient, onHarnessLog});

        await expect(engine.train(definition, modelConfig, executionConfig)).resolves.toEqual({finalState: state, weights: [[[1, 2]]]});
        expect(harnessClient.buildModel).toHaveBeenCalledWith(modelConfig, executionConfig);
        expect(harnessClient.predict).not.toHaveBeenCalled();
        expect(harnessClient.completeTraining).toHaveBeenCalledWith([]);
        expect(onHarnessLog).toHaveBeenNthCalledWith(1, "building model");
        expect(onHarnessLog).toHaveBeenNthCalledWith(2, "training complete");
        expect(harnessClient.close).toHaveBeenCalled();
    });

    it("throws when harness model build fails", async () => {
        const harnessClient = createHarnessClient();
        harnessClient.buildModel.mockResolvedValue({ok: false, error: "boom"});

        const state = {terminated: true} as GameState;
        const definition = {
            spec: async () => ({fields: [], encode: () => []}),
            resolveActionSelection: jest.fn()
        } as unknown as GameDefinition;
        const engine = new TrainingEngine(definition, state, {harnessClient});

        await expect(engine.train(definition, modelConfig, executionConfig)).rejects.toThrow("boom");
        expect(harnessClient.close).toHaveBeenCalled();
    });

    it("passes execution config to the harness when provided", async () => {
        const harnessClient = createHarnessClient();
        harnessClient.buildModel.mockResolvedValue({ok: true, result: {modelJson: {class_name: "Sequential"}}});
        harnessClient.completeTraining.mockResolvedValue({ok: true, result: {weights: [[[2, 3]]]}}); 

        const state = {terminated: true} as GameState;
        const definition = {
            spec: async () => ({fields: [], encode: () => []}),
            resolveActionSelection: jest.fn()
        } as unknown as GameDefinition;
        const engine = new TrainingEngine(definition, state, {harnessClient});
        const weightedExecutionConfig: TrainingExecutionConfig = {
            executionCount: 1,
            intermediateResultIncrement: 0,
            initialWeights: [[[1, 2]]]
        };

        await expect(engine.train(definition, modelConfig, weightedExecutionConfig)).resolves.toEqual({finalState: state, weights: [[[2, 3]]]});
        expect(harnessClient.buildModel).toHaveBeenCalledWith(modelConfig, weightedExecutionConfig);
        expect(harnessClient.completeTraining).toHaveBeenCalledWith([]);
    });

    it("translates harness predictions via game definition before applying action", async () => {
        const harnessClient = createHarnessClient();
        harnessClient.buildModel.mockResolvedValue({ok: true, result: {ready: true}});
        harnessClient.predict.mockResolvedValue({ok: true, result: [[0, 0]]});
        harnessClient.completeTraining.mockResolvedValue({ok: true, result: {weights: [[[0.5, 0.25]]]}}); 

        const state = {
            terminated: false,
            players: {active: "1"},
            regions: {},
            winners: []
        } as unknown as GameState;
        const actionExecute = jest.fn((_game, gameState) => {
            gameState.terminated = true;
        });
        const definition = {
            spec: async () => ({fields: [], encode: () => [0, 0, 0]}),
            getObservation: jest.fn(() => ({board: [0, 0, 0]})),
            resolveActionSelection: jest.fn(function(gameState, prediction: number[]) {
                void gameState;
                void prediction;
                return {
                    action: this.actions[0],
                    parameters: {location: "0_0"}
                };
            }),
            actions: [{
                id: "mark",
                parameters: {location: "string"},
                execute: actionExecute
            }]
        } as unknown as GameDefinition;
        const engine = new TrainingEngine(definition, state, {harnessClient});

        await expect(engine.train(definition, modelConfig, executionConfig)).resolves.toEqual({finalState: state, weights: [[[0.5, 0.25]]]});
        expect(harnessClient.predict).toHaveBeenCalledWith([0, 0, 0]);
        expect(definition.resolveActionSelection).toHaveBeenCalledWith(state, [0, 0]);
        expect(harnessClient.completeTraining).toHaveBeenCalledWith([
            {
                observation: [0, 0, 0],
                policyOutput: [0, 0],
                actionIndex: 0,
                reward: 0,
                nextObservation: [0, 0, 0],
                isTerminal: true
            }
        ]);
        expect(actionExecute).toHaveBeenCalled();
        expect(harnessClient.close).toHaveBeenCalled();
    });

    it("repeats execution the requested number of times", async () => {
        const harnessClient = createHarnessClient();
        harnessClient.buildModel.mockResolvedValue({ok: true, result: {ready: true}});
        harnessClient.predict.mockResolvedValue({ok: true, result: [[0, 0]]});
        harnessClient.completeTraining.mockResolvedValue({ok: true, result: {weights: [[[0.75, 0.5]]]}}); 

        const state = {
            terminated: false,
            players: {active: "1"},
            regions: {playArea: {id: "playArea", contains: [], state: {}}},
            winners: [],
            entities: {}
        } as unknown as GameState;
        const actionExecute = jest.fn((_game, gameState) => {
            gameState.terminated = true;
        });
        const definition = {
            spec: async () => ({fields: [], encode: () => [0, 0, 0]}),
            getObservation: jest.fn(() => ({board: [0, 0, 0]})),
            resolveActionSelection: jest.fn(function(gameState, prediction: number[]) {
                void gameState;
                void prediction;
                return {
                    action: this.actions[0],
                    parameters: {}
                };
            }),
            actions: [{
                id: "mark",
                parameters: {},
                execute: actionExecute
            }]
        } as unknown as GameDefinition;
        const engine = new TrainingEngine(definition, state, {harnessClient});

        await expect(engine.train(definition, modelConfig, {executionCount: 2})).resolves.toEqual({finalState: state, weights: [[[0.75, 0.5]]]});
        expect(harnessClient.predict).toHaveBeenCalledTimes(2);
        expect(harnessClient.completeTraining).toHaveBeenCalledWith([
            {
                observation: [0, 0, 0],
                policyOutput: [0, 0],
                actionIndex: 0,
                reward: 0,
                nextObservation: [0, 0, 0],
                isTerminal: true
            },
            {
                observation: [0, 0, 0],
                policyOutput: [0, 0],
                actionIndex: 0,
                reward: 0,
                nextObservation: [0, 0, 0],
                isTerminal: true
            }
        ]);
        expect(actionExecute).toHaveBeenCalledTimes(2);
    });

    it("captures intermediate weights using the configured accumulation increment", async () => {
        const harnessClient = createHarnessClient();
        harnessClient.buildModel.mockResolvedValue({ok: true, result: {ready: true}});
        harnessClient.predict.mockResolvedValue({ok: true, result: [[0, 0]]});
        const capturedBatchSizes: number[] = [];
        harnessClient.completeTraining.mockImplementation(async (batch) => {
            capturedBatchSizes.push(batch.length);
            const weightsByCall = [
                {ok: true, result: {weights: [[[1]]]}, logs: ["batch 1"]},
                {ok: true, result: {weights: [[[2]]]}, logs: ["batch 2"]},
                {ok: true, result: {weights: [[[3]]]}, logs: ["final batch"]}
            ];
            return weightsByCall[capturedBatchSizes.length - 1];
        });

        const state = {
            terminated: false,
            players: {active: "1"},
            regions: {playArea: {id: "playArea", contains: [], state: {}}},
            winners: [],
            entities: {}
        } as unknown as GameState;
        const actionExecute = jest.fn((_game, gameState) => {
            gameState.terminated = true;
        });
        const definition = {
            spec: async () => ({fields: [], encode: () => [0, 0, 0]}),
            getObservation: jest.fn(() => ({board: [0, 0, 0]})),
            resolveActionSelection: jest.fn(function(gameState, prediction: number[]) {
                void gameState;
                void prediction;
                return {
                    action: this.actions[0],
                    parameters: {}
                };
            }),
            actions: [{
                id: "mark",
                parameters: {},
                execute: actionExecute
            }]
        } as unknown as GameDefinition;
        const engine = new TrainingEngine(definition, state, {harnessClient});

        await expect(
            engine.train(definition, modelConfig, {executionCount: 5, intermediateResultIncrement: 2})
        ).resolves.toEqual({
            finalState: state,
            weights: [[[3]]],
            intermediateResults: [
                {completedExecutions: 2, weights: [[[1]]]},
                {completedExecutions: 4, weights: [[[2]]]}
            ]
        });
        expect(harnessClient.predict).toHaveBeenCalledTimes(5);
        expect(harnessClient.completeTraining).toHaveBeenCalledTimes(3);
        expect(capturedBatchSizes).toEqual([2, 2, 1]);
        expect(actionExecute).toHaveBeenCalledTimes(5);
    });
});
