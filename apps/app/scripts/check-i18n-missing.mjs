import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localeDir = join(__dirname, "..", "src", "i18n", "locales");

function loadLocale(filename) {
  let source = readFileSync(join(localeDir, filename), "utf8");
  source = source.replace(/^export default/m, "module.exports =");
  source = source.replace(/\s+as const;\s*$/m, ";");
  const context = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(source, context, { filename });
  return context.module.exports;
}

const localeArg = process.argv[2] ?? "zh";
const overlayFilename = `${localeArg}.custom.ts`;
const localeFilename = `${localeArg}.ts`;

const en = loadLocale("en.ts");
const locale = loadLocale(localeFilename);
let overlay = {};

try {
  overlay = loadLocale(overlayFilename);
} catch {
  overlay = {};
}

const merged = {
  ...locale,
  ...overlay,
};

const missing = Object.entries(en)
  .filter(([key]) => !(key in merged))
  .map(([key, value]) => ({
    key,
    value,
  }));

if (missing.length === 0) {
  console.log(`No missing ${localeArg} locale keys.`);
  process.exit(0);
}

console.error(`Missing ${missing.length} ${localeArg} locale keys:`);
for (const { key, value } of missing) {
  console.error(`- ${key}: ${String(value).replace(/\n/g, "\\n")}`);
}

process.exit(1);
