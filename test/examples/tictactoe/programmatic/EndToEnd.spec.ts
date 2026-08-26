// @ts-ignore
import {Tictactoe} from "../../../../examples/tictactoe";
import {BaseGameDefinition} from "../../../../src/definitions/BaseGameDefinition";
import {TrainingExecutionConfig} from "../../../../src/execution/TrainingExecutionConfig";
import TrainingEngine from "../../../../src/execution/TrainingEngine";
import {TrainingModelConfig} from "../../../../src/execution/TrainingModelConfig";

describe("Complete tictactoe end-to-end", () => {
    describe("game", () => {
        const createModelConfig = (): TrainingModelConfig => ({
            type: "sequential",
            inputShape: [9],
            outputShape: [2],
            layers: [
                {
                    type: "dense",
                    units: 16,
                    activation: "relu"
                },
                {
                    type: "dense",
                    units: 2
                }
            ],
            optimizer: "adam",
            loss: "binary_crossentropy",
            metrics: ["accuracy"]
        });

        const createExecutionConfig = (initialWeights?: TrainingExecutionConfig["initialWeights"]): TrainingExecutionConfig => ({
            executionCount: 1,
            initialWeights,
            agentConfig: {
                framework: "torchrl",
                type: "reinforce",
                discountFactor: 0.99,
                batchSize: 4,
                epochs: 1
            }
        });

        it("executes a training loop", async () => {
            const [game, state] = BaseGameDefinition.GenerateFromDefinition(new Tictactoe());
            const gameTrainer = new TrainingEngine(game, state, {
                pythonExecutable:"/c/Users/Damie/IdeaProjects/game-design-machine-learning/.venv/Scripts/python"
            });

            const trainingResult = await gameTrainer.train(game, createModelConfig(), createExecutionConfig());
            const trainingWeights = (trainingResult as {weights?: unknown}).weights;

            expect(trainingWeights).toBeDefined();
            expect(state.terminated).toBeTruthy();
        }, 10000);

        it("reuses initial weights and updates them after another training run", async () => {
            const [game1, state1] = BaseGameDefinition.GenerateFromDefinition(new Tictactoe());
            const trainer1 = new TrainingEngine(game1, state1, {
                pythonExecutable:"/c/Users/Damie/IdeaProjects/game-design-machine-learning/.venv/Scripts/python"
            });
            const firstResult = await trainer1.train(game1, createModelConfig(), createExecutionConfig());
            const firstWeights = (firstResult as {weights?: unknown}).weights;

            expect(firstWeights).toBeDefined();

            const [game2, state2] = BaseGameDefinition.GenerateFromDefinition(new Tictactoe());
            const trainer2 = new TrainingEngine(game2, state2, {
                pythonExecutable:"/c/Users/Damie/IdeaProjects/game-design-machine-learning/.venv/Scripts/python"
            });
            const secondResult = await trainer2.train(
                game2,
                createModelConfig(),
                createExecutionConfig(firstResult.weights)
            );
            const secondWeights = (secondResult as {weights?: unknown}).weights;

            expect(secondWeights).toBeDefined();
            expect(JSON.stringify(secondWeights)).not.toEqual(JSON.stringify(firstWeights));
            expect(state2.terminated).toBeTruthy();
        }, 15000);
    });
});
