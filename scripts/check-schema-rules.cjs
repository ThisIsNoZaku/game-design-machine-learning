const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const SCHEMAS_DIR = path.join(ROOT_DIR, "src", "json", "schemas");
const RULES_CONFIG_PATH = path.join(__dirname, "check-schema-rules.config.json");
const JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const SCHEMA_FILE_SUFFIX = ".schema.json";
const RULE_KEYS = Object.freeze([
  "requireObjectRoot",
  "requireDraft2020Schema",
  "requireSchemaIdMatchesFileName",
  "requireUniqueSchemaIds",
  "requireTopLevelType",
  "validateRequiredProperties",
  "requirePropertyDescriptions",
  "validateLocalRefs",
  "requireSchemaPathMatchesId",
]);

async function readSchemaFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const filePaths = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await readSchemaFiles(fullPath);
      filePaths.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(SCHEMA_FILE_SUFFIX)) {
      filePaths.push(fullPath);
    }
  }

  return filePaths.sort((a, b) => a.localeCompare(b));
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readRulesConfig() {
  const raw = await fs.readFile(RULES_CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);

  if (!isPlainObject(config)) {
    throw new Error(`Rules config at "${RULES_CONFIG_PATH}" must be a JSON object.`);
  }

  for (const key of RULE_KEYS) {
    if (typeof config[key] !== "boolean") {
      throw new Error(`Rules config key "${key}" must be a boolean.`);
    }
  }

  for (const key of Object.keys(config)) {
    if (!RULE_KEYS.includes(key)) {
      throw new Error(`Rules config contains unknown key "${key}".`);
    }
  }

  return config;
}

function walkSchema(node, pointer, callback) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      walkSchema(item, `${pointer}/${index}`, callback);
    });
    return;
  }

  if (!isPlainObject(node)) {
    return;
  }

  callback(node, pointer);

  for (const [key, value] of Object.entries(node)) {
    walkSchema(value, `${pointer}/${key}`, callback);
  }
}

function validateRequiredKeys(schemaNode, pointer, addError) {
  if (!Object.prototype.hasOwnProperty.call(schemaNode, "required")) {
    return;
  }

  const { required } = schemaNode;
  if (!Array.isArray(required)) {
    addError(pointer, '"required" must be an array when present.');
    return;
  }

  if (!required.every((key) => typeof key === "string")) {
    addError(pointer, '"required" must only contain strings.');
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(schemaNode, "properties")) {
    addError(pointer, '"required" is present but "properties" is missing.');
    return;
  }

  if (!isPlainObject(schemaNode.properties)) {
    addError(pointer, '"properties" must be an object when "required" is present.');
    return;
  }

  for (const requiredKey of required) {
    if (!Object.prototype.hasOwnProperty.call(schemaNode.properties, requiredKey)) {
      addError(pointer, `"required" key "${requiredKey}" is missing from "properties".`);
    }
  }
}

function validateLocalRef(refValue, pointer, schemaFilePath, knownSchemaPaths, addError) {
  if (typeof refValue !== "string" || !refValue.startsWith("./")) {
    return;
  }

  if (!refValue.endsWith(SCHEMA_FILE_SUFFIX)) {
    addError(pointer, `Local $ref "${refValue}" must point to a ${SCHEMA_FILE_SUFFIX} file.`);
    return;
  }

  const targetPath = path.normalize(path.join(path.dirname(schemaFilePath), refValue));
  if (!knownSchemaPaths.has(targetPath)) {
    addError(pointer, `Local $ref "${refValue}" does not resolve to an existing schema file.`);
  }
}

function validatePropertyDescriptions(schemaNode, pointer, addError) {
  if (!isPlainObject(schemaNode.properties)) {
    return;
  }

  for (const [propertyName, propertyDefinition] of Object.entries(schemaNode.properties)) {
    const propertyPointer = `${pointer}/properties/${propertyName}`;
    if (!isPlainObject(propertyDefinition)) {
      addError(propertyPointer, "Property definition must be an object.");
      continue;
    }

    if (typeof propertyDefinition.description !== "string" || propertyDefinition.description.trim().length === 0) {
      addError(propertyPointer, 'Property definition must include a non-empty "description".');
    }
  }
}

async function main() {
  const rules = await readRulesConfig();
  const schemaPaths = await readSchemaFiles(SCHEMAS_DIR);
  const knownSchemaPaths = new Set(schemaPaths);
  const seenIds = new Set();
  const errors = [];

  for (const schemaPath of schemaPaths) {
    const fileName = path.basename(schemaPath);
    const relativePath = toPosixPath(path.relative(ROOT_DIR, schemaPath));
    const schemaLabel = toPosixPath(path.relative(SCHEMAS_DIR, schemaPath));

    const addError = (pointer, message) => {
      errors.push(`${schemaLabel} ${pointer}: ${message}`);
    };

    let schema;
    try {
      const raw = await fs.readFile(schemaPath, "utf8");
      schema = JSON.parse(raw);
    } catch (error) {
      addError("#", `File is not valid JSON. ${error.message}`);
      continue;
    }

    if (rules.requireObjectRoot && !isPlainObject(schema)) {
      addError("#", "Top-level schema value must be an object.");
      continue;
    }

    if (rules.requireDraft2020Schema && schema.$schema !== JSON_SCHEMA_2020_12) {
      addError("#/$schema", `"$schema" must be "${JSON_SCHEMA_2020_12}".`);
    }

    const expectedId = `src/json/schemas/${fileName}`;
    if (rules.requireSchemaIdMatchesFileName && schema.$id !== expectedId) {
      addError("#/$id", `"$id" must be "${expectedId}".`);
    }

    if (rules.requireUniqueSchemaIds && typeof schema.$id === "string") {
      if (seenIds.has(schema.$id)) {
        addError("#/$id", `Duplicate "$id" value "${schema.$id}" detected.`);
      } else {
        seenIds.add(schema.$id);
      }
    }

    if (rules.requireTopLevelType) {
      if (!Object.prototype.hasOwnProperty.call(schema, "type")) {
        addError("#/type", 'Top-level schema must define a "type".');
      } else if (typeof schema.type !== "string" && !Array.isArray(schema.type)) {
        addError("#/type", '"type" must be a string or an array of strings.');
      }
    }

    if (rules.validateRequiredProperties || rules.requirePropertyDescriptions || rules.validateLocalRefs) {
      walkSchema(schema, "#", (node, pointer) => {
        if (rules.validateRequiredProperties) {
          validateRequiredKeys(node, pointer, addError);
        }

        if (rules.requirePropertyDescriptions) {
          validatePropertyDescriptions(node, pointer, addError);
        }

        if (rules.validateLocalRefs && Object.prototype.hasOwnProperty.call(node, "$ref")) {
          validateLocalRef(node.$ref, `${pointer}/$ref`, schemaPath, knownSchemaPaths, addError);
        }
      });
    }

    if (rules.requireSchemaPathMatchesId && relativePath !== expectedId) {
      addError("#", `Schema location "${relativePath}" must match "$id" path "${expectedId}".`);
    }
  }

  if (errors.length > 0) {
    console.error(`Schema rule check failed with ${errors.length} violation(s):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Schema rule check passed for ${schemaPaths.length} schema file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
