import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const manifest = JSON.parse(await readFile(join(dist, "manifest.json"), "utf8"));

assert(manifest.manifest_version === 3, "Manifest 必须使用版本 3");
assert(manifest.minimum_chrome_version === "138", "最低 Chrome 版本必须为 138");
assert(JSON.stringify(manifest.permissions) === JSON.stringify(["storage"]), "常驻权限超出预算");
assert(
  JSON.stringify(manifest.host_permissions) === JSON.stringify(["https://github.com/*"]),
  "常驻站点权限必须仅包含 GitHub",
);
assert(manifest.background?.service_worker === "background.js", "后台入口缺失");
assert(manifest.content_scripts?.[0]?.js?.[0] === "content.js", "内容脚本入口缺失");

const requiredFiles = [
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "options.html",
  "options.js",
  "icons/icon-128.png",
  "_locales/zh_CN/messages.json",
  "_locales/en/messages.json",
];
for (const path of requiredFiles) {
  assert((await stat(join(dist, path))).isFile(), `构建产物缺少 ${path}`);
}

const contentScript = await readFile(join(dist, "content.js"), "utf8");
assert(!/apiKey|Authorization|x-goog-api-key/.test(contentScript), "内容脚本包含密钥相关字段");
assert(!/api\.openai\.com|generativelanguage\.googleapis\.com|api\.deepseek\.com/.test(contentScript), "内容脚本不应直接连接增强服务");

for (const path of await collectTextFiles(dist)) {
  const text = await readFile(path, "utf8");
  assert(!/\beval\s*\(|new\s+Function\s*\(/.test(text), `${path} 包含动态代码执行`);
  if (extname(path) === ".html") {
    assert(!/<script[^>]+src=["']https?:/i.test(text), `${path} 包含远程脚本`);
    assert(!/<link[^>]+href=["']https?:/i.test(text), `${path} 包含远程样式或字体`);
  }
}

console.log("Manifest、安全边界与构建入口检查通过。");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function collectTextFiles(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await collectTextFiles(path)));
    else if ([".js", ".html", ".css", ".json"].includes(extname(path))) paths.push(path);
  }
  return paths;
}
