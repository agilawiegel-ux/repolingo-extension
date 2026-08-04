import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pngjs from "pngjs";

const { PNG } = pngjs;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const dist = join(root, "dist");

if (basename(dist) !== "dist" || !dist.startsWith(`${root}${sep}`)) {
  throw new Error("Refusing to clean an unexpected build directory.");
}

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "icons"), { recursive: true });

const entries = ["background", "content", "popup", "options"];
await Promise.all(
  entries.map((name) =>
    build({
      entryPoints: [join(root, "src", `${name}.ts`)],
      outfile: join(dist, `${name}.js`),
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "chrome138",
      minify: true,
      legalComments: "none",
      sourcemap: false,
      charset: "utf8",
      logLevel: "info",
    }),
  ),
);

for (const file of ["manifest.json", "popup.html", "popup.css", "options.html", "options.css"]) {
  await cp(join(root, "src", file), join(dist, file));
}
await cp(join(root, "src", "_locales"), join(dist, "_locales"), {
  recursive: true,
});

for (const size of [16, 32, 48, 128]) {
  await writeFile(
    join(dist, "icons", `icon-${size}.png`),
    PNG.sync.write(createIcon(size), { colorType: 6, inputColorType: 6 }),
  );
}

const manifestPath = join(dist, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
manifest.version = packageJson.version;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

function createIcon(size) {
  const scale = 4;
  const canvasSize = size * scale;
  const pixels = new Uint8Array(canvasSize * canvasSize * 4);
  const color = {
    ink: [23, 32, 42, 255],
    white: [247, 250, 249, 255],
    celadon: [40, 127, 120, 255],
    bright: [69, 184, 173, 255],
  };
  const s = (value) => Math.round((value / 128) * canvasSize);

  roundedRect(pixels, canvasSize, 0, 0, canvasSize, canvasSize, s(30), color.ink);
  roundedRect(pixels, canvasSize, s(29), s(34), s(21), s(68), s(3), color.white);
  roundedRect(pixels, canvasSize, s(42), s(34), s(43), s(18), s(8), color.white);
  roundedRect(pixels, canvasSize, s(42), s(62), s(39), s(18), s(8), color.white);
  polygon(pixels, canvasSize, [
    [s(57), s(67)], [s(76), s(67)], [s(101), s(102)], [s(78), s(102)],
  ], color.white);
  circle(pixels, canvasSize, s(91), s(34), s(9), color.bright);
  roundedRect(pixels, canvasSize, s(22), s(103), s(84), s(6), s(3), color.celadon);

  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const source = (((y * scale + sy) * canvasSize) + x * scale + sx) * 4;
          for (let channel = 0; channel < 4; channel += 1) totals[channel] += pixels[source + channel];
        }
      }
      const target = (y * size + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) png.data[target + channel] = Math.round(totals[channel] / (scale * scale));
    }
  }
  return png;
}

function roundedRect(pixels, width, x, y, w, h, radius, fill) {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      const dx = Math.max(x + radius - px, 0, px - (x + w - radius - 1));
      const dy = Math.max(y + radius - py, 0, py - (y + h - radius - 1));
      if (dx * dx + dy * dy <= radius * radius) setPixel(pixels, width, px, py, fill);
    }
  }
}

function circle(pixels, width, cx, cy, radius, fill) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) setPixel(pixels, width, x, y, fill);
    }
  }
}

function polygon(pixels, width, points, fill) {
  const minY = Math.min(...points.map((point) => point[1]));
  const maxY = Math.max(...points.map((point) => point[1]));
  for (let y = minY; y <= maxY; y += 1) {
    const intersections = [];
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        intersections.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let index = 0; index < intersections.length; index += 2) {
      for (let x = Math.ceil(intersections[index]); x <= Math.floor(intersections[index + 1]); x += 1) setPixel(pixels, width, x, y, fill);
    }
  }
}

function setPixel(pixels, width, x, y, fill) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const offset = (y * width + x) * 4;
  pixels.set(fill, offset);
}
