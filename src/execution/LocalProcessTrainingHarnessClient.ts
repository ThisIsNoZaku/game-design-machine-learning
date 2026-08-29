import {spawn, type ChildProcessWithoutNullStreams} from "node:child_process";
import * as net from "node:net";
import {TrainingExecutionConfig} from "./TrainingExecutionConfig";
import {TrainingModelConfig} from "./TrainingModelConfig";
import {HarnessResponse, TrainingHarnessClient, TrainingTransition} from "./TrainingHarnessClient";

export interface LocalProcessTrainingHarnessClientOptions {
    pythonExecutable: string;
    harnessPath: string;
    host: string;
    timeoutMs: number;
}

export default class LocalProcessTrainingHarnessClient implements TrainingHarnessClient {
    private sidecar?: ChildProcessWithoutNullStreams;
    private socket?: net.Socket;
    private readonly socketBuffers = new WeakMap<net.Socket, string>();
    private onSidecarStdoutData?: (chunk: Buffer | string) => void;
    private onSidecarStderrData?: (chunk: Buffer | string) => void;

    constructor(private readonly options: LocalProcessTrainingHarnessClientOptions) {}

    async buildModel(modelConfig: TrainingModelConfig, executionConfig: TrainingExecutionConfig): Promise<HarnessResponse> {
        await this.ensureConnected();
        this.socket?.write(JSON.stringify({modelConfig, executionConfig}) + "\n");
        return this.readHarnessResponse();
    }

    async predict(observation: number[]): Promise<HarnessResponse> {
        await this.ensureConnected();
        this.socket?.write(JSON.stringify({observation}) + "\n");
        return this.readHarnessResponse();
    }

    async completeTraining(transitions: TrainingTransition[]): Promise<HarnessResponse> {
        await this.ensureConnected();
        this.socket?.write(JSON.stringify({completeTraining: {transitions}}) + "\n");
        return this.readHarnessResponse();
    }

    async close(): Promise<void> {
        if (this.socket && !this.socket.destroyed) {
            this.socket.end();
        }
        this.socket = undefined;

        if (this.sidecar) {
            if (this.onSidecarStdoutData) {
                this.sidecar.stdout?.removeListener("data", this.onSidecarStdoutData);
            }
            if (this.onSidecarStderrData) {
                this.sidecar.stderr?.removeListener("data", this.onSidecarStderrData);
            }
            this.sidecar.kill();
            this.sidecar = undefined;
        }
    }

    private async ensureConnected(): Promise<void> {
        if (this.socket && !this.socket.destroyed) {
            return;
        }

        console.info(
            `Starting training harness with Python executable: ${this.options.pythonExecutable}, harness path: ${this.options.harnessPath}, host: ${this.options.host}, timeout: ${this.options.timeoutMs}ms`
        );
        const sidecar = spawn(this.options.pythonExecutable, [this.options.harnessPath], {stdio: ["pipe", "pipe", "pipe"]});
        this.sidecar = sidecar;

        this.onSidecarStdoutData = (chunk: Buffer | string): void => {
            process.stdout.write(chunk.toString());
        };
        this.onSidecarStderrData = (chunk: Buffer | string): void => {
            process.stderr.write(chunk.toString());
        };
        sidecar.stdout?.on("data", this.onSidecarStdoutData);
        sidecar.stderr?.on("data", this.onSidecarStderrData);

        console.info("Waiting for training harness to be ready");
        const readyPort = await this.waitForHarnessReady(sidecar, this.options.timeoutMs);
        console.info(`Training harness is ready on port ${readyPort}, connecting...`);

        console.info("Connecting to harness process");
        this.socket = await this.connectToHarness(this.options.host, readyPort, this.options.timeoutMs);
    }

    private waitForHarnessReady(sidecar: ReturnType<typeof spawn>, timeoutMs: number): Promise<number> {
        const stdout = sidecar.stdout;
        const stderr = sidecar.stderr;

        if (!stdout || !stderr) {
            return Promise.reject(new Error("Harness process did not expose stdio streams"));
        }

        return new Promise<number>((resolve, reject) => {
            let stderrOutput = "";
            let stdoutBuffer = "";
            let settled = false;

            const complete = (callback: () => void): void => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeoutHandle);
                stdout.removeListener("data", onStdoutData);
                stderr.removeListener("data", onStderrData);
                sidecar.removeListener("exit", onExit);
                callback();
            };

            const onStdoutData = (chunk: Buffer | string): void => {
                const stdoutText = chunk.toString();
                stdoutBuffer += stdoutText;
                const lines = stdoutBuffer.split("\n");
                stdoutBuffer = lines.pop() ?? "";

                for (const line of lines) {
                    const text = line.trim();
                    if (!text) {
                        continue;
                    }

                    try {
                        const message = JSON.parse(text) as {type?: string; port?: number; error?: string};
                        if (message.type === "ready" && typeof message.port === "number") {
                            complete(() => resolve(message.port as number));
                            return;
                        }
                        if (message.type === "error") {
                            const errorMessage = typeof message.error === "string" ? message.error : "Harness failed before opening socket";
                            complete(() => reject(new Error(errorMessage)));
                            return;
                        }
                    } catch {
                        // Ignore unrelated stdout until the harness sends the ready envelope.
                    }
                }
            };

            const onStderrData = (chunk: Buffer | string): void => {
                stderrOutput += chunk.toString();
            };

            const onExit = (code: number | null): void => {
                const trimmedError = stderrOutput.trim();
                const details = trimmedError ? `: ${trimmedError}` : "";
                complete(() => reject(new Error(`Harness process exited before ready (code ${String(code)})${details}`)));
            };

            const timeoutHandle = setTimeout(() => {
                complete(() => reject(new Error("Timed out waiting for harness socket readiness")));
            }, timeoutMs);

            stdout.on("data", onStdoutData);
            stderr.on("data", onStderrData);
            sidecar.on("exit", onExit);
        });
    }

    private connectToHarness(host: string, port: number, timeoutMs: number): Promise<net.Socket> {
        return new Promise((resolve, reject) => {
            console.info(`Connecting to harness at ${host}:${port}`);
            const socket = net.createConnection({host, port});
            const timeoutHandle = setTimeout(() => {
                socket.destroy(new Error("Timed out connecting to harness socket"));
            }, timeoutMs);

            socket.once("connect", () => {
                console.log("Confirmed connection to Harness socket");
                clearTimeout(timeoutHandle);
                resolve(socket);
            });

            socket.once("error", (error) => {
                clearTimeout(timeoutHandle);
                reject(error);
            });
        });
    }

    private readHarnessResponse(): Promise<HarnessResponse> {
        const socket = this.socket;
        if (!socket) {
            return Promise.reject(new Error("Harness socket is not connected"));
        }
        const timeoutMs = this.options.timeoutMs;

        return new Promise((resolve, reject) => {
            let timeoutHandle: ReturnType<typeof setTimeout>;
            const resetTimeout = (): void => {
                clearTimeout(timeoutHandle);
                timeoutHandle = setTimeout(() => {
                    socket.destroy(new Error("Timed out waiting for harness response"));
                }, timeoutMs);
            };

            const complete = (callback: () => void): void => {
                clearTimeout(timeoutHandle);
                socket.removeListener("data", onData);
                socket.removeListener("error", onError);
                socket.removeListener("close", onClose);
                callback();
            };

            const tryResolveFromBuffer = (): boolean => {
                const responseBuffer = this.socketBuffers.get(socket) ?? "";
                const lineBreakIndex = responseBuffer.indexOf("\n");
                if (lineBreakIndex < 0) {
                    return false;
                }

                const envelope = responseBuffer.slice(0, lineBreakIndex).trim();
                const remainingBuffer = responseBuffer.slice(lineBreakIndex + 1);
                this.socketBuffers.set(socket, remainingBuffer);

                complete(() => {
                    if (!envelope) {
                        reject(new Error("Harness returned an empty response"));
                        return;
                    }

                    try {
                        const parsed = JSON.parse(envelope) as HarnessResponse;
                        resolve(parsed);
                    } catch {
                        reject(new Error(`Harness returned invalid JSON: ${envelope}`));
                    }
                });
                return true;
            };

            resetTimeout();

            const onData = (chunk: Buffer): void => {
                resetTimeout();
                const currentBuffer = this.socketBuffers.get(socket) ?? "";
                this.socketBuffers.set(socket, currentBuffer + chunk.toString());
                tryResolveFromBuffer();
            };

            const onError = (error: Error): void => {
                complete(() => reject(error));
            };

            const onClose = (): void => {
                const responseBuffer = this.socketBuffers.get(socket) ?? "";
                if (responseBuffer.trim().length === 0) {
                    complete(() => reject(new Error("Harness closed socket without returning a response")));
                    return;
                }
                if (!tryResolveFromBuffer()) {
                    complete(() => reject(new Error(`Harness closed socket with an incomplete response: ${responseBuffer}`)));
                }
            };

            if (tryResolveFromBuffer()) {
                return;
            }

            socket.on("data", onData);
            socket.once("error", onError);
            socket.once("close", onClose);
        });
    }
}
