import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const dist = join(root, "dist");
const release = join(root, "release");
if (basename(dist) !== "dist" || !dist.startsWith(`${root}${sep}`)) {
  throw new Error("Unexpected build directory.");
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const files = {};
await collect(dist, files);
await mkdir(release, { recursive: true });
const output = join(release, `repolingo-chromium-v${packageJson.version}.zip`);
const archive = zipSync(files, {
  level: 9,
  mtime: new Date("2026-01-01T00:00:00.000Z"),
});
await writeFile(output, archive);
const checksum = createHash("sha256").update(archive).digest("hex");
await writeFile(`${output.replace(/\.zip$/, "")}.sha256`, `${checksum}  ${basename(output)}\n`);
console.log(relative(root, output));

async function collect(directory, target) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) await collect(absolute, target);
    else target[relative(dist, absolute).replaceAll("\\", "/")] = new Uint8Array(await readFile(absolute));
  }
}
