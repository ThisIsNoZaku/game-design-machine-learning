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


def _to_shape(values: Any, field_name: str) -> tuple[int, ...]:
    if not isinstance(values, list) or len(values) == 0:
        raise ValueError(f"'{field_name}' must be a non-empty list of positive integers")
    shape: List[int] = []
    for index, value in enumerate(values):
        if not isinstance(value, int) or value <= 0:
            raise ValueError(f"'{field_name}[{index}]' must be a positive integer")
        shape.append(value)
    return tuple(shape)


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


def _append_log(logs: List[str], message: str) -> None:
    logs.append(message)


def _handle_client_connection(connection: socket.socket) -> None:
    logs: List[str] = []
    model: Optional[Any] = None
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
                    model_config = payload.get("modelConfig")
                    if not isinstance(model_config, dict):
                        raise ValueError("Payload must include object field 'modelConfig'")
                    print("Building TensorFlow model")
                    model = _build_model_from_config(model_config, logs)
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
                
                else:
                    raise ValueError("Payload must include either 'modelConfig' or 'observation'")
            
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