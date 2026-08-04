import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const zip = join(root, "release", `repolingo-chromium-v${packageJson.version}.zip`);
const unpackedLimit = 500 * 1024;
const zipLimit = 250 * 1024;

const unpacked = await directorySize(dist);
let zipped = 0;
try {
  zipped = (await stat(zip)).size;
} catch {
  // A release archive is optional during incremental development.
}

console.log(`Unpacked: ${(unpacked / 1024).toFixed(1)} KB / 500 KB`);
if (zipped) console.log(`ZIP: ${(zipped / 1024).toFixed(1)} KB / 250 KB`);
if (unpacked > unpackedLimit) throw new Error("Unpacked extension exceeds 500 KB.");
if (zipped > zipLimit) throw new Error("Release ZIP exceeds 250 KB.");

async function directorySize(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    total += entry.isDirectory() ? await directorySize(path) : (await stat(path)).size;
  }
  return total;
}
