import json
import socket
import traceback
import importlib
from typing import Any, Dict, List, Optional


def _make_json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple)):
        return [_make_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _make_json_safe(item) for key, item in value.items()}
    return repr(value)


def _append_log(logs: List[str], message: str) -> None:
    logs.append(message)


def _load_torch(logs: Optional[List[str]] = None) -> Any:
    try:
        module = importlib.import_module("torch")
        if logs is not None:
            print("Loaded torch module", flush=True)
        return module
    except Exception as import_error:
        raise RuntimeError(
            "PyTorch is not available in this Python environment. Install src/execution/sidecars/requirements-torchrl.txt in the interpreter used by TrainingEngine."
        ) from import_error


def _load_torchrl(logs: Optional[List[str]] = None) -> Any:
    try:
        module = importlib.import_module("torchrl")
        if logs is not None:
            print("Loaded torchrl module", flush=True)
        return module
    except Exception as import_error:
        raise RuntimeError(
            "TorchRL is not available in this Python environment. Install src/execution/sidecars/requirements-torchrl.txt in the interpreter used by TrainingEngine."
        ) from import_error


def _to_shape(values: Any, field_name: str) -> tuple[int, ...]:
    if not isinstance(values, list) or len(values) == 0:
        raise ValueError(f"'{field_name}' must be a non-empty list of positive integers")
    shape: List[int] = []
    for index, value in enumerate(values):
        if not isinstance(value, int) or value <= 0:
            raise ValueError(f"'{field_name}[{index}]' must be a positive integer")
        shape.append(value)
    return tuple(shape)


def _product(values: tuple[int, ...]) -> int:
    total = 1
    for value in values:
        total *= value
    return total


def _validate_agent_config(agent_config: Any) -> Optional[Dict[str, Any]]:
    if agent_config is None:
        return None
    if not isinstance(agent_config, dict):
        raise ValueError("'agentConfig' must be an object when provided")

    framework = agent_config.get("framework")
    if framework != "torchrl":
        raise ValueError("Only 'torchrl' agent framework is supported by harness_torch.py")

    agent_type = agent_config.get("type")
    if agent_type != "reinforce":
        raise ValueError("Only 'reinforce' torchrl agent type is supported")

    for field_name in ["discountFactor", "learningRate"]:
        field_value = agent_config.get(field_name)
        if field_value is not None and not isinstance(field_value, (int, float)):
            raise ValueError(f"'{field_name}' must be numeric when provided")

    for field_name in ["batchSize", "epochs"]:
        field_value = agent_config.get(field_name)
        if field_value is not None and (not isinstance(field_value, int) or field_value <= 0):
            raise ValueError(f"'{field_name}' must be a positive integer when provided")

    return agent_config


def _validate_execution_config(execution_config: Any) -> Optional[Dict[str, Any]]:
    if execution_config is None:
        return None
    if not isinstance(execution_config, dict):
        raise ValueError("'executionConfig' must be an object when provided")

    execution_count = execution_config.get("executionCount")
    if execution_count is not None and (not isinstance(execution_count, int) or execution_count <= 0):
        raise ValueError("'executionCount' must be a positive integer when provided")

    _validate_agent_config(execution_config.get("agentConfig"))
    return execution_config


def _build_activation(torch_nn: Any, activation: str) -> Any:
    if activation == "relu":
        return torch_nn.ReLU()
    if activation == "sigmoid":
        return torch_nn.Sigmoid()
    if activation == "tanh":
        return torch_nn.Tanh()
    raise ValueError(f"Unsupported activation '{activation}'")


def _build_model_from_config(model_config: Dict[str, Any], logs: Optional[List[str]] = None) -> Any:
    torch = _load_torch(logs)
    torch_nn = torch.nn
    model_type = model_config.get("type", "sequential")
    if model_type != "sequential":
        raise ValueError("Only 'sequential' model type is supported")

    layers = model_config.get("layers")
    if not isinstance(layers, list) or len(layers) == 0:
        raise ValueError("'layers' must be a non-empty list")

    optimizer = model_config.get("optimizer")
    if not isinstance(optimizer, str) or not optimizer:
        raise ValueError("'optimizer' must be a non-empty string")

    loss = model_config.get("loss")
    if not isinstance(loss, str) or not loss:
        raise ValueError("'loss' must be a non-empty string")

    metrics = model_config.get("metrics")
    if metrics is not None and not isinstance(metrics, list):
        raise ValueError("'metrics' must be a list of strings when provided")

    root_input_shape = _to_shape(model_config.get("inputShape"), "inputShape")
    output_shape = _to_shape(model_config.get("outputShape"), "outputShape")
    current_width = _product(root_input_shape)
    modules: List[Any] = [torch_nn.Flatten()]
    linear_layer_count = 0

    for layer_config in layers:
        if not isinstance(layer_config, dict):
            raise ValueError("Every layer config must be an object")

        layer_type = layer_config.get("type")
        if layer_type != "dense":
            raise ValueError(f"Unsupported layer type '{layer_type}'")

        units = layer_config.get("units")
        if not isinstance(units, int) or units <= 0:
            raise ValueError("Dense layer 'units' must be a positive integer")

        modules.append(torch_nn.Linear(current_width, units))
        linear_layer_count += 1
        current_width = units

        activation = layer_config.get("activation")
        if activation is not None:
            if not isinstance(activation, str) or not activation:
                raise ValueError("Dense layer 'activation' must be a non-empty string when provided")
            modules.append(_build_activation(torch_nn, activation))

    expected_units = _product(output_shape)
    if current_width != expected_units:
        raise ValueError(
            f"Last dense layer 'units' ({current_width}) must equal outputShape size ({expected_units})"
        )

    model = torch_nn.Sequential(*modules)
    setattr(model, "_training_model_config", model_config)
    setattr(model, "_input_shape", root_input_shape)
    setattr(model, "_output_shape", output_shape)
    setattr(model, "_linear_layer_count", linear_layer_count)
    return model


def _serialize_model_weights(model: Any) -> List[Any]:
    serialized_weights: List[Any] = []
    for parameter in model.parameters():
        if hasattr(parameter, "detach"):
            value = parameter.detach()
            if hasattr(value, "cpu"):
                value = value.cpu()
            if hasattr(value, "tolist"):
                serialized_weights.append(value.tolist())
                continue
        serialized_weights.append(parameter)
    return serialized_weights


def _apply_model_weights(model: Any, serialized_weights: Any) -> None:
    if not isinstance(serialized_weights, list):
        raise ValueError("'initialWeights' must be an array when provided")

    torch = _load_torch()
    parameters = list(model.parameters())
    if len(serialized_weights) != len(parameters):
        raise ValueError(
            f"'initialWeights' length ({len(serialized_weights)}) must match model parameter count ({len(parameters)})"
        )

    with torch.no_grad():
        for index, (serialized_weight, parameter) in enumerate(zip(serialized_weights, parameters)):
            tensor_value = torch.tensor(serialized_weight, dtype=parameter.dtype)
            if tuple(tensor_value.shape) != tuple(parameter.shape):
                raise ValueError(
                    f"'initialWeights[{index}]' shape {tuple(tensor_value.shape)} does not match parameter shape {tuple(parameter.shape)}"
                )
            parameter.copy_(tensor_value)


def _build_result_from_model(model: Any) -> Dict[str, Any]:
    model_config = getattr(model, "_training_model_config")
    return {
        "layerCount": getattr(model, "_linear_layer_count", 0),
        "inputShape": [None, *list(getattr(model, "_input_shape"))],
        "outputShape": [None, *list(getattr(model, "_output_shape"))],
        "modelJson": {
            "class_name": "Sequential",
            "backend": "torch",
            "config": model_config
        }
    }


def _coerce_numeric_vector(values: Any, field_name: str) -> List[float]:
    if not isinstance(values, list) or len(values) == 0:
        raise ValueError(f"'{field_name}' must be a non-empty array of numbers")
    vector: List[float] = []
    for index, value in enumerate(values):
        if not isinstance(value, (int, float)):
            raise ValueError(f"'{field_name}[{index}]' must be numeric")
        vector.append(float(value))
    return vector


def _normalize_transition(transition: Any, output_size: int) -> Dict[str, Any]:
    if not isinstance(transition, dict):
        raise ValueError("Every transition must be an object")

    observation = _coerce_numeric_vector(transition.get("observation"), "observation")
    policy_output = _coerce_numeric_vector(transition.get("policyOutput"), "policyOutput")
    next_observation = _coerce_numeric_vector(transition.get("nextObservation"), "nextObservation")

    if len(policy_output) != output_size:
        raise ValueError(
            f"'policyOutput' length ({len(policy_output)}) must match flattened output shape ({output_size})"
        )

    action_index = transition.get("actionIndex")
    if not isinstance(action_index, int) or action_index < 0:
        raise ValueError("'actionIndex' must be a non-negative integer")

    reward = transition.get("reward")
    if not isinstance(reward, (int, float)):
        raise ValueError("'reward' must be numeric")

    is_terminal = transition.get("isTerminal")
    if not isinstance(is_terminal, bool):
        raise ValueError("'isTerminal' must be boolean")

    return {
        "observation": observation,
        "policyOutput": policy_output,
        "actionIndex": action_index,
        "reward": float(reward),
        "nextObservation": next_observation,
        "isTerminal": is_terminal
    }


def _compute_discounted_returns(transitions: List[Dict[str, Any]], discount_factor: float) -> List[float]:
    discounted_returns = [0.0] * len(transitions)
    running_return = 0.0
    for index in range(len(transitions) - 1, -1, -1):
        transition = transitions[index]
        if transition["isTerminal"]:
            running_return = transition["reward"]
        else:
            running_return = transition["reward"] + (discount_factor * running_return)
        discounted_returns[index] = running_return
    return discounted_returns


def _resolve_optimizer(torch: Any, optimizer_name: str, model: Any, learning_rate: float) -> Any:
    optimizer_name = optimizer_name.lower()
    if optimizer_name == "adam":
        return torch.optim.Adam(model.parameters(), lr=learning_rate)
    if optimizer_name == "sgd":
        return torch.optim.SGD(model.parameters(), lr=learning_rate)
    raise ValueError(f"Unsupported optimizer '{optimizer_name}'")


def _run_reinforcement_update(
    model: Any,
    model_config: Dict[str, Any],
    execution_config: Optional[Dict[str, Any]],
    transitions: List[Dict[str, Any]],
    logs: Optional[List[str]] = None
) -> Dict[str, Any]:
    agent_config = _validate_agent_config((execution_config or {}).get("agentConfig"))
    if agent_config is None:
        if logs is not None:
            _append_log(logs, "No torchrl config provided; returning current model weights")
        return {
            "weights": _serialize_model_weights(model),
            "transitionCount": len(transitions),
            "trained": False
        }

    torch = _load_torch(logs)
    _load_torchrl(logs)
    replay_buffers_module = importlib.import_module("torchrl.data")
    tensordict_module = importlib.import_module("tensordict")
    TensorDict = getattr(tensordict_module, "TensorDict")
    ReplayBuffer = getattr(replay_buffers_module, "ReplayBuffer")
    ListStorage = getattr(replay_buffers_module, "ListStorage")

    output_size = _product(_to_shape(model_config.get("outputShape"), "outputShape"))
    normalized_transitions = [_normalize_transition(transition, output_size) for transition in transitions]
    if len(normalized_transitions) == 0:
        if logs is not None:
            _append_log(logs, "No transitions received; returning current model weights")
        return {
            "weights": _serialize_model_weights(model),
            "transitionCount": 0,
            "trained": False
        }

    discount_factor = float(agent_config.get("discountFactor", 0.99))
    learning_rate = float(agent_config.get("learningRate", 1e-3))
    batch_size = int(agent_config.get("batchSize", min(len(normalized_transitions), 32)))
    epochs = int(agent_config.get("epochs", 1))

    replay_buffer = ReplayBuffer(storage=ListStorage(max_size=len(normalized_transitions)))
    discounted_returns = _compute_discounted_returns(normalized_transitions, discount_factor)
    for transition, discounted_return in zip(normalized_transitions, discounted_returns):
        replay_buffer.add(
            TensorDict(
                {
                    "observation": torch.tensor(transition["observation"], dtype=torch.float32),
                    "policyOutput": torch.tensor(transition["policyOutput"], dtype=torch.float32),
                    "actionIndex": torch.tensor(transition["actionIndex"], dtype=torch.long),
                    "discountedReturn": torch.tensor(discounted_return, dtype=torch.float32),
                },
                batch_size=[]
            )
        )

    optimizer = _resolve_optimizer(torch, model_config.get("optimizer", "adam"), model, learning_rate)
    model.train()
    last_loss = 0.0
    sample_size = min(batch_size, len(normalized_transitions))
    for epoch in range(epochs):
        batch = replay_buffer.sample(sample_size)
        observations = batch["observation"]
        policy_outputs = batch["policyOutput"]
        action_indices = batch["actionIndex"].to(torch.float32).unsqueeze(1)
        returns = batch["discountedReturn"]
        optimizer.zero_grad()
        predictions = model(observations)
        if output_size > 1:
            targets = torch.cat([action_indices, policy_outputs[:, 1:]], dim=1)
        else:
            targets = action_indices
        per_example_loss = torch.mean((predictions - targets) ** 2, dim=1)
        signed_loss = torch.mean(per_example_loss * returns)
        signed_loss.backward()
        optimizer.step()
        last_loss = float(signed_loss.detach().cpu().item())
        if logs is not None:
            _append_log(logs, f"Completed torchrl reinforcement epoch {epoch + 1}/{epochs}")

    model.eval()
    return {
        "weights": _serialize_model_weights(model),
        "transitionCount": len(normalized_transitions),
        "trained": True,
        "lastLoss": last_loss
    }


def _predict_model(model: Any, observation: List[float]) -> Any:
    torch = _load_torch()
    model.eval()
    with torch.no_grad():
        tensor_input = torch.tensor([observation], dtype=torch.float32)
        prediction = model(tensor_input)
    if hasattr(prediction, "detach"):
        prediction = prediction.detach()
    if hasattr(prediction, "cpu"):
        prediction = prediction.cpu()
    if hasattr(prediction, "tolist"):
        return prediction.tolist()
    return prediction


def _handle_client_connection(connection: socket.socket) -> None:
    logs: List[str] = []
    model: Optional[Any] = None
    model_config: Optional[Dict[str, Any]] = None
    execution_config: Optional[Dict[str, Any]] = None
    request_buffer = ""

    print("Handling client connection", flush=True)

    while True:
        while "\n" not in request_buffer:
            chunk = connection.recv(4096)
            if not chunk:
                break
            request_buffer += chunk.decode("utf-8")

        if "\n" not in request_buffer:
            break

        request_line, request_buffer = request_buffer.split("\n", 1)
        request_line = request_line.strip()

        if not request_line:
            _append_log(logs, "Empty request line received")
            response = {"ok": False, "error": "Empty request line", "logs": logs}
        else:
            try:
                payload = json.loads(request_line)

                if "modelConfig" in payload:
                    print("Received training configuration payload", flush=True)
                    model_config_payload = payload.get("modelConfig")
                    if not isinstance(model_config_payload, dict):
                        raise ValueError("Payload must include object field 'modelConfig'")
                    execution_config = _validate_execution_config(payload.get("executionConfig"))
                    print("Building torch model", flush=True)
                    model = _build_model_from_config(model_config_payload, logs)
                    initial_weights = payload.get("initialWeights")
                    if execution_config is not None and execution_config.get("initialWeights") is not None:
                        initial_weights = execution_config.get("initialWeights")
                    if initial_weights is not None:
                        print("Applying initial model weights", flush=True)
                        _apply_model_weights(model, initial_weights)
                    model_config = model_config_payload
                    print("Model built", flush=True)
                    execution_result = _build_result_from_model(model)
                    print("Returning model metadata", flush=True)
                    response = {"ok": True, "result": _make_json_safe(execution_result), "logs": logs}

                elif "observation" in payload:
                    print("Received observation inference request", flush=True)
                    if model is None:
                        raise ValueError("Model must be built before sending observations")
                    observation = payload.get("observation")
                    if not isinstance(observation, list):
                        raise ValueError("Observation must be an array")
                    print(f"Running model inference on observation (shape: {len(observation)})", flush=True)
                    prediction_value = _predict_model(model, _coerce_numeric_vector(observation, "observation"))
                    print("Model inference completed", flush=True)
                    response = {"ok": True, "result": _make_json_safe(prediction_value), "logs": logs}

                elif "completeTraining" in payload:
                    print("Received training completion payload", flush=True)
                    if model is None or model_config is None:
                        raise ValueError("Model must be built before completing training")
                    completion_payload = payload.get("completeTraining")
                    if not isinstance(completion_payload, dict):
                        raise ValueError("'completeTraining' must be an object")
                    transitions = completion_payload.get("transitions")
                    if not isinstance(transitions, list):
                        raise ValueError("'completeTraining.transitions' must be an array")
                    print(f"Applying torchrl update over {len(transitions)} transitions", flush=True)
                    training_result = _run_reinforcement_update(model, model_config, execution_config, transitions, logs)
                    print("Returning updated model weights", flush=True)
                    response = {"ok": True, "result": _make_json_safe(training_result), "logs": logs}

                else:
                    raise ValueError("Payload must include 'modelConfig', 'observation', or 'completeTraining'")

            except Exception as execution_error:
                print(f"Request failed: {execution_error}", flush=True)
                response = {
                    "ok": False,
                    "error": str(execution_error),
                    "traceback": traceback.format_exc(),
                    "logs": logs
                }

        connection.sendall((json.dumps(response) + "\n").encode("utf-8"))
        logs = []


def main() -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(("127.0.0.1", 0))
    server.listen(1)
    _, port = server.getsockname()
    print(json.dumps({"type": "ready", "port": port}), flush=True)

    try:
        print("Waiting for connection", flush=True)
        connection, _ = server.accept()
        print("Connection accepted", flush=True)
        _handle_client_connection(connection)
    except Exception:
        server.close()


if __name__ == "__main__":
    main()
