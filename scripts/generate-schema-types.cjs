const fs = require("fs/promises");
const path = require("path");
const { compileFromFile } = require("json-schema-to-typescript");

const rootDir = path.resolve(__dirname, "..");
const schemasDir = path.join(rootDir, "src", "json", "schemas");
const outputDir = path.join(rootDir, "src", "descriptions");

async function generateSchemaTypes() {
  await fs.mkdir(outputDir, { recursive: true });

  const entries = await fs.readdir(schemasDir, { withFileTypes: true });
  const schemaFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
    .map((entry) => entry.name)
    .sort();

  for (const schemaFile of schemaFiles) {
    const inputPath = path.join(schemasDir, schemaFile);
    const fileNameMatch = new RegExp("^(.*?)\\.schema\\.json$").exec(schemaFile);
    const outputName = `${fileNameMatch[1].substring(0, 1).toLocaleUpperCase() + fileNameMatch[1].substring(1)}Description.d.ts`
    const outputPath = path.join(outputDir, outputName);
    const source = await compileFromFile(inputPath, { cwd: schemasDir,
    customName: schema => {
      if (schema.title) return `${schema.title}Description`;
      return undefined;
    }});

    await fs.writeFile(outputPath, `${source.trimEnd()}\n`, "utf8");
  }
}

generateSchemaTypes().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
