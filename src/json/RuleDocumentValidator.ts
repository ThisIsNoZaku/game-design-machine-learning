import {JSONSchemaType, ValidateFunction} from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { addSchemas, game} from "./schemas";
import formatValidationErrors from "./schemas/formatSchemaErrors";

export class RuleDocumentValidator {
    private readonly validator: ValidateFunction<any>;

    constructor() {
        const schema = new Ajv2020();
        addSchemas(schema);
        this.validator = schema.compile(game);

    }

    validate(input: string | object) {
        let valid = false;
        if(typeof input === "string") {
            valid = this.validateString(input);
        } else if(typeof input === "object") {
            valid = this.validateObject(input);
        } else {
            throw new Error("Input must be a string or an object");
        }

        if(!valid) {
            throw new Error(formatValidationErrors(this.validator.errors));
        } else {
            return true;
        }
    }



    validateString(jsonString: string) {
        return this.validator(JSON.parse(jsonString)) as boolean;
    }

    validateObject(jsonObject: object) {
        return this.validator(jsonObject) as boolean;
    }

}