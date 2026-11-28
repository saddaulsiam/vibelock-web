/**
 * Organizes TypeScript/TSX imports across the project using TypeScript's
 * Language Service `organizeImports` API (the same engine behind VS Code's Alt+Shift+O).
 *
 * Usage:
 *   node scripts/organize-imports.mjs          # Organize and write changes
 *   node scripts/organize-imports.mjs --check  # Dry-run; exits 1 if changes are needed
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const isCheckMode = process.argv.includes("--check");
const projectRoot = process.cwd();
const tsconfigPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json");

if (!tsconfigPath) {
  console.error("Could not find tsconfig.json");
  process.exit(1);
}

const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
if (configFile.error) {
  console.error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
  process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(tsconfigPath)
);

const targetFiles = parsedConfig.fileNames.filter((file) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    (normalized.endsWith(".ts") || normalized.endsWith(".tsx")) &&
    !normalized.endsWith(".d.ts") &&
    !normalized.includes("/node_modules/") &&
    !normalized.includes("/.next/")
  );
});

const fileVersions = new Map();
const fileSnapshots = new Map();

for (const file of targetFiles) {
  const content = fs.readFileSync(file, "utf8");
  fileVersions.set(file, 1);
  fileSnapshots.set(file, ts.ScriptSnapshot.fromString(content));
}

const servicesHost = {
  getScriptFileNames: () => targetFiles,
  getScriptVersion: (fileName) => String(fileVersions.get(fileName) ?? 1),
  getScriptSnapshot: (fileName) => {
    const cached = fileSnapshots.get(fileName);
    if (cached) return cached;
    if (fs.existsSync(fileName)) {
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf8"));
    }
    return undefined;
  },
  getCurrentDirectory: () => projectRoot,
  getCompilationSettings: () => parsedConfig.options,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
};

const languageService = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());

const formatOptions = {
  indentSize: 2,
  tabSize: 2,
  convertTabsToSpaces: true,
  newLineCharacter: "\n",
  insertSpaceAfterCommaDelimiter: true,
  insertSpaceAfterSemicolonInForStatements: true,
  insertSpaceBeforeAndAfterBinaryOperators: true,
  insertSpaceAfterKeywordsInControlFlowStatements: true,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
  semicolons: ts.SemicolonPreference.Insert,
};

function applyTextChanges(sourceText, changes) {
  const sorted = [...changes].sort((a, b) => b.span.start - a.span.start);
  let result = sourceText;
  for (const change of sorted) {
    const start = change.span.start;
    const end = start + change.span.length;
    result = result.slice(0, start) + change.newText + result.slice(end);
  }
  return result;
}

const changedFiles = [];

for (const file of targetFiles) {
  const original = fs.readFileSync(file, "utf8");
  const fileChanges = languageService.organizeImports(
    { type: "file", fileName: file },
    {
      ...formatOptions,
      newLineCharacter: original.includes("\r\n") ? "\r\n" : "\n",
    },
    {}
  );

  if (!fileChanges || fileChanges.length === 0) continue;

  const allTextChanges = fileChanges.flatMap((fc) => fc.textChanges);
  if (allTextChanges.length === 0) continue;

  const updated = applyTextChanges(original, allTextChanges);
  if (updated !== original) {
    changedFiles.push(path.relative(projectRoot, file));
    if (!isCheckMode) {
      fs.writeFileSync(file, updated, "utf8");
    }
  }
}

if (changedFiles.length === 0) {
  console.log(`All ${targetFiles.length} TypeScript files already have organized imports.`);
  process.exit(0);
}

if (isCheckMode) {
  console.error(`Found ${changedFiles.length} file(s) with unorganized imports:`);
  for (const file of changedFiles) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
} else {
  console.log(`Organized imports in ${changedFiles.length} file(s):`);
  for (const file of changedFiles) {
    console.log(`  - ${file}`);
  }
}
