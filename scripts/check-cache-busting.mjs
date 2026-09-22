import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const htmlFiles = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name)
  .sort();

const fail = (message) => {
  console.error(`Cache-busting check failed: ${message}`);
  process.exitCode = 1;
};

const htmlContents = await Promise.all(htmlFiles.map(async (file) => [file, await readFile(path.join(root, file), "utf8")]));
const styleVersions = new Set();
const mainVersions = new Set();

for (const [file, html] of htmlContents) {
  const styleMatches = [...html.matchAll(/\/css\/styles\.css\?v=([^"']+)/g)];
  const mainMatches = [...html.matchAll(/\/js\/main\.js\?v=([^"']+)/g)];

  if (styleMatches.length !== 1) fail(`${file} debe referenciar exactamente una versión de styles.css.`);
  if (mainMatches.length !== 1) fail(`${file} debe referenciar exactamente una versión de main.js.`);
  if (styleMatches[0]) styleVersions.add(styleMatches[0][1]);
  if (mainMatches[0]) mainVersions.add(mainMatches[0][1]);
}

if (styleVersions.size > 1) fail(`styles.css tiene versiones divergentes: ${[...styleVersions].join(", ")}.`);
if (mainVersions.size > 1) fail(`main.js tiene versiones divergentes: ${[...mainVersions].join(", ")}.`);

const jsDir = path.join(root, "js");
const jsFiles = (await readdir(jsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
  .map((entry) => entry.name);
const localImportVersions = new Map();
const localImportPattern = /(?:from\s+|import\s*\(\s*)["'](\.\/[^"']+\.js)(?:\?v=([^"'#]+))?["']/g;

for (const file of jsFiles) {
  const source = await readFile(path.join(jsDir, file), "utf8");
  for (const match of source.matchAll(localImportPattern)) {
    const importedPath = match[1];
    const version = match[2];
    if (!version) fail(`${file} importa ${importedPath} sin versión.`);
    const versions = localImportVersions.get(importedPath) ?? new Set();
    versions.add(version);
    localImportVersions.set(importedPath, versions);
  }
}

for (const [importedPath, versions] of localImportVersions) {
  if (versions.size > 1) fail(`${importedPath} tiene versiones divergentes: ${[...versions].join(", ")}.`);
}

if (process.exitCode !== 1) {
  console.log(`Cache-busting OK: ${htmlFiles.length} páginas, styles.css?v=${[...styleVersions][0]}, main.js?v=${[...mainVersions][0]}, ${localImportVersions.size} módulos ESM versionados.`);
}
