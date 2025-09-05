import {JSONSchemaType, ValidateFunction} from "ajv";
import Ajv2020 from "ajv/dist/2020";
import {addSchemas, game} from "./schemas";
import formatValidationErrors from "./formatSchemaErrors";

export class RuleDocumentValidator {
    private readonly validator: ValidateFunction<any>;

    constructor() {
        const schema = new Ajv2020();
        addSchemas(schema);
        this.validator = schema.compile(game);

    }

    validate(input: string | object):object {
        let output = null;
        if (typeof input === "string") {
            output = this.validateString(input);
        } else if (typeof input === "object") {
            output = this.validateObject(input);
        } else {
            throw new Error("Input must be a string or an object");
        }

        if (!output) {
            throw new Error(formatValidationErrors(this.validator.errors));
        } else {
            return output;
        }
    }


    validateString(jsonString: string): object | undefined {
        var parsed = JSON.parse(jsonString);
        return this.validateObject(parsed);
    }

    validateObject(jsonObject: object): object | undefined {
        if (this.validator(jsonObject)) {
            return jsonObject;
        }
    }

}