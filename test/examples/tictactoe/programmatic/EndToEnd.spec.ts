// @ts-ignore
import {Tictactoe} from "../../../../examples/tictactoe";
import {BaseGameDefinition} from "../../../../src/definitions/BaseGameDefinition";
import act from "../../../../src/execution/act";
import {pick_random} from "../../../../src/execution/pick";
import TrainingEngine from "../../../../src/execution/TrainingEngine";
import {TrainingModelConfig} from "../../../../src/execution/TrainingModelConfig";

describe("Complete tictactoe end-to-end", () => {
    describe("game", () => {
        it("executes a training loop", async () => {
            const [game, state] = BaseGameDefinition.GenerateFromDefinition(new Tictactoe());
            const gameTrainer = new TrainingEngine(game, state, {
                pythonExecutable:"/c/Users/Damie/IdeaProjects/game-design-machine-learning/.venv/Scripts/python"
            });

            const modelConfig: TrainingModelConfig = {
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
            };

            const trainingResult = await gameTrainer.train(game, modelConfig);

            console.log(JSON.stringify(trainingResult.finalState));
            expect(state.terminated).toBeTruthy();
        });
    });
});
