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


def _load_tensorflow(logs: Optional[List[str]] = None) -> Any:
    try:
        module = importlib.import_module("tensorflow")
        if logs is not None:
            print("Loaded tensorflow module", flush=True)
        return module
    except Exception as import_error:
        raise RuntimeError(
            "TensorFlow is not available in this Python environment. Install it in the interpreter used by TrainingEngine."
        ) from import_error


def _load_tf_agents(logs: Optional[List[str]] = None) -> Any:
    try:
        module = importlib.import_module("tf_agents")
        if logs is not None:
            print("Loaded tf_agents module", flush=True)
        return module
    except Exception as import_error:
        raise RuntimeError(
            "TF-Agents is not available in this Python environment. Install it in the interpreter used by TrainingEngine."
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
    result = 1
    for value in values:
        result *= value
    return result


def _validate_agent_config(agent_config: Any) -> Optional[Dict[str, Any]]:
    if agent_config is None:
        return None
    if not isinstance(agent_config, dict):
        raise ValueError("'agentConfig' must be an object when provided")

    framework = agent_config.get("framework")
    if framework != "tf_agents":
        raise ValueError("Only 'tf_agents' agent framework is supported")

    agent_type = agent_config.get("type")
    if agent_type != "reinforce":
        raise ValueError("Only 'reinforce' tf_agents agent type is supported")

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


def _build_model_from_config(model_config: Dict[str, Any], logs: Optional[List[str]] = None) -> Any:
    tf = _load_tensorflow(logs)
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
    model = tf.keras.Sequential()
    root_input_shape = model_config.get("inputShape")
    output_shape = _to_shape(model_config.get("outputShape"), "outputShape")
    layer_index = 0
    for layer_config in layers:
        if not isinstance(layer_config, dict):
            raise ValueError("Every layer config must be an object")

        layer_type = layer_config.get("type")
        if layer_type != "dense":
            raise ValueError(f"Unsupported layer type '{layer_type}'")

        units = layer_config.get("units")
        if not isinstance(units, int) or units <= 0:
            raise ValueError("Dense layer 'units' must be a positive integer")

        layer_kwargs: Dict[str, Any] = {"units": units}
        activation = layer_config.get("activation")
        if activation is not None:
            if not isinstance(activation, str) or not activation:
                raise ValueError("Dense layer 'activation' must be a non-empty string when provided")
            layer_kwargs["activation"] = activation

        if "inputShape" in layer_config:
            layer_kwargs["input_shape"] = _to_shape(layer_config.get("inputShape"), "inputShape")
        elif layer_index == 0 and root_input_shape is not None:
            layer_kwargs["input_shape"] = _to_shape(root_input_shape, "inputShape")

        model.add(tf.keras.layers.Dense(**layer_kwargs))
        layer_index += 1

    last_layer = layers[-1]
    expected_units = 1
    for dimension in output_shape:
        expected_units *= dimension
    last_layer_units = last_layer.get("units")
    if last_layer_units != expected_units:
        raise ValueError(
            f"Last dense layer 'units' ({last_layer_units}) must equal outputShape size ({expected_units})"
        )

    compile_kwargs: Dict[str, Any] = {
        "optimizer": optimizer,
        "loss": loss
    }

    if metrics is not None:
        checked_metrics: List[str] = []
        for index, metric in enumerate(metrics):
            if not isinstance(metric, str) or not metric:
                raise ValueError(f"'metrics[{index}]' must be a non-empty string")
            checked_metrics.append(metric)
        compile_kwargs["metrics"] = checked_metrics

    model.compile(**compile_kwargs)
    return model


def _serialize_model_weights(model: Any) -> List[Any]:
    serialized_weights: List[Any] = []
    for weight in model.get_weights():
        if hasattr(weight, "tolist"):
            serialized_weights.append(weight.tolist())
        else:
            serialized_weights.append(weight)
    return serialized_weights


def _build_result_from_model(model: Any) -> Dict[str, Any]:
    output_shape = model.output_shape
    if isinstance(output_shape, tuple):
        serializable_output_shape = list(output_shape)
    else:
        serializable_output_shape = output_shape

    return {
        "layerCount": len(model.layers),
        "inputShape": model.input_shape,
        "outputShape": serializable_output_shape,
        "modelJson": json.loads(model.to_json())
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


def _build_replay_buffer(tf: Any, input_shape: tuple[int, ...], output_size: int, transition_count: int) -> Any:
    tensor_spec_module = importlib.import_module("tf_agents.specs.tensor_spec")
    replay_buffer_module = importlib.import_module("tf_agents.replay_buffers.tf_uniform_replay_buffer")
    data_spec = {
        "observation": tensor_spec_module.TensorSpec(shape=input_shape, dtype=tf.float32, name="observation"),
        "policyOutput": tensor_spec_module.TensorSpec(shape=(output_size,), dtype=tf.float32, name="policyOutput"),
        "actionIndex": tensor_spec_module.TensorSpec(shape=(), dtype=tf.int32, name="actionIndex"),
        "discountedReturn": tensor_spec_module.TensorSpec(shape=(), dtype=tf.float32, name="discountedReturn")
    }
    return replay_buffer_module.TFUniformReplayBuffer(
        data_spec=data_spec,
        batch_size=1,
        max_length=max(1, transition_count)
    )


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
            _append_log(logs, "No tf_agents config provided; returning current model weights")
        return {
            "weights": _serialize_model_weights(model),
            "transitionCount": len(transitions),
            "trained": False
        }

    _load_tf_agents(logs)
    tf = _load_tensorflow(logs)
    input_shape = _to_shape(model_config.get("inputShape"), "inputShape")
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
    batch_size = int(agent_config.get("batchSize", min(len(normalized_transitions), 32)))
    epochs = int(agent_config.get("epochs", 1))
    learning_rate = agent_config.get("learningRate")
    optimizer = model.optimizer
    if learning_rate is not None and hasattr(optimizer, "learning_rate"):
        optimizer.learning_rate.assign(float(learning_rate))

    replay_buffer = _build_replay_buffer(tf, input_shape, output_size, len(normalized_transitions))
    discounted_returns = _compute_discounted_returns(normalized_transitions, discount_factor)
    for transition, discounted_return in zip(normalized_transitions, discounted_returns):
        replay_buffer.add_batch({
            "observation": tf.convert_to_tensor([transition["observation"]], dtype=tf.float32),
            "policyOutput": tf.convert_to_tensor([transition["policyOutput"]], dtype=tf.float32),
            "actionIndex": tf.convert_to_tensor([transition["actionIndex"]], dtype=tf.int32),
            "discountedReturn": tf.convert_to_tensor([discounted_return], dtype=tf.float32)
        })

    last_loss = 0.0
    for epoch in range(epochs):
        dataset = replay_buffer.as_dataset(
            sample_batch_size=min(batch_size, len(normalized_transitions)),
            num_steps=1,
            single_deterministic_pass=True
        )
        for experience, _ in dataset:
            observations = tf.cast(experience["observation"][:, 0, :], tf.float32)
            policy_outputs = tf.cast(experience["policyOutput"][:, 0, :], tf.float32)
            action_indices = tf.cast(experience["actionIndex"][:, 0], tf.float32)
            returns = tf.cast(experience["discountedReturn"][:, 0], tf.float32)
            action_targets = tf.expand_dims(action_indices, axis=1)
            if output_size > 1:
                targets = tf.concat([action_targets, policy_outputs[:, 1:]], axis=1)
            else:
                targets = action_targets

            with tf.GradientTape() as tape:
                predictions = tf.cast(model(observations, training=True), tf.float32)
                per_example_loss = tf.reduce_mean(tf.square(predictions - targets), axis=1)
                signed_loss = tf.reduce_mean(per_example_loss * returns)

            gradients = tape.gradient(signed_loss, model.trainable_variables)
            optimizer.apply_gradients(zip(gradients, model.trainable_variables))
            last_loss = float(signed_loss.numpy())
        if logs is not None:
            _append_log(logs, f"Completed reinforcement epoch {epoch + 1}/{epochs}")

    return {
        "weights": _serialize_model_weights(model),
        "transitionCount": len(normalized_transitions),
        "trained": True,
        "lastLoss": last_loss
    }


def _append_log(logs: List[str], message: str) -> None:
    logs.append(message)


def _handle_client_connection(connection: socket.socket) -> None:
    logs: List[str] = []
    model: Optional[Any] = None
    model_config: Optional[Dict[str, Any]] = None
    execution_config: Optional[Dict[str, Any]] = None
    request_buffer = ""

    print("Handling client connection", flush=True)
    
    while True:
        # Read request line
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
                
                # Handle model configuration request
                if "modelConfig" in payload:
                    print("Received training configuration payload")
                    model_config_payload = payload.get("modelConfig")
                    if not isinstance(model_config_payload, dict):
                        raise ValueError("Payload must include object field 'modelConfig'")
                    execution_config = _validate_execution_config(payload.get("executionConfig"))
                    print("Building TensorFlow model")
                    model = _build_model_from_config(model_config_payload, logs)
                    model_config = model_config_payload
                    print("Model built and compiled")
                    execution_result = _build_result_from_model(model)
                    print("Returning model metadata")
                    response = {"ok": True, "result": _make_json_safe(execution_result), "logs": logs}
                
                # Handle observation inference request
                elif "observation" in payload:
                    print("Received observation inference request")
                    if model is None:
                        raise ValueError("Model must be built before sending observations")
                    observation = payload.get("observation")
                    if not isinstance(observation, list):
                        raise ValueError("Observation must be an array")
                    print(f"Running model inference on observation (shape: {len(observation)})")
                    try:
                        prediction = model.predict([observation], verbose=0)
                    except Exception as list_predict_error:
                        print(f"List input rejected by model.predict: {list_predict_error}")
                        tf = _load_tensorflow(logs)
                        tensor_input = tf.convert_to_tensor([observation], dtype=tf.float32)
                        prediction = model.predict(tensor_input, verbose=0)
                    # Convert prediction to JSON-safe format
                    if hasattr(prediction, "tolist"):
                        prediction_value = prediction.tolist()
                    elif hasattr(prediction, "numpy"):
                        prediction_value = prediction.numpy().tolist()
                    else:
                        prediction_value = prediction
                    result = _make_json_safe(prediction_value)
                    print("Model inference completed")
                    response = {"ok": True, "result": result, "logs": logs}

                elif "completeTraining" in payload:
                    print("Received training completion payload")
                    if model is None or model_config is None:
                        raise ValueError("Model must be built before completing training")
                    completion_payload = payload.get("completeTraining")
                    if not isinstance(completion_payload, dict):
                        raise ValueError("'completeTraining' must be an object")
                    transitions = completion_payload.get("transitions")
                    if not isinstance(transitions, list):
                        raise ValueError("'completeTraining.transitions' must be an array")
                    print(f"Applying reinforcement update over {len(transitions)} transitions")
                    training_result = _run_reinforcement_update(model, model_config, execution_config, transitions, logs)
                    print("Returning updated model weights")
                    response = {"ok": True, "result": _make_json_safe(training_result), "logs": logs}
                 
                else:
                    raise ValueError("Payload must include 'modelConfig', 'observation', or 'completeTraining'")
            
            except Exception as execution_error:
                print(f"Request failed: {execution_error}")
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