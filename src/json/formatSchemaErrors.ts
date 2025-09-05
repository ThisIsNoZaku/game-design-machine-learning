import {ErrorObject} from "ajv";

export default function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
    if(!errors || errors.length === 0) {
        return "";
    }
    return errors.map(formatError).join(", ");
}

function formatError(error: ErrorObject): string {
    return `${error.message}@'${error.instancePath}': ${Object.values(error.params)}`;
}