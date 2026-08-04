import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseHTML } from "linkedom";

for (const path of ["src/popup.html", "src/options.html", "docs/index.html"]) {
  test(`${path} 具备基础语义和可访问名称`, async () => {
    const html = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const { document } = parseHTML(html);
    assert.equal(document.documentElement.getAttribute("lang"), "zh-CN");
    assert.ok(document.title.trim());
    assert.ok(document.querySelector("main"));

    for (const button of document.querySelectorAll("button")) {
      const name = button.getAttribute("aria-label") || button.textContent?.trim();
      assert.ok(name, `${path} 存在没有可访问名称的按钮`);
    }
    for (const input of document.querySelectorAll("input")) {
      const id = input.getAttribute("id");
      const labelled =
        Boolean(input.closest("label")) ||
        Boolean(id && document.querySelector(`label[for="${id}"]`)) ||
        Boolean(input.getAttribute("aria-label"));
      assert.ok(labelled, `${path} 存在没有标签的输入控件`);
    }
  });
}

test("官网提供跳到主要内容的入口", async () => {
  const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
  const { document } = parseHTML(html);
  const skip = document.querySelector<HTMLAnchorElement>(".skip-link");
  assert.equal(skip?.getAttribute("href"), "#main-content");
  assert.ok(document.querySelector("#main-content"));
});

test("官网首屏采用收敛后的 RepoLingo v1.1 标题与交互演示", async () => {
  const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
  const { document } = parseHTML(html);
  const title = document.querySelector("#hero-title")?.textContent?.replace(/\s+/g, "");
  assert.equal(title, "让GitHub，更易读懂。");
  assert.ok(document.querySelector("#demo-switch"));
  assert.ok(document.querySelector("#demo-bilingual"));
  assert.ok(document.querySelector("#demo-panel"));
  const demo = await readFile(new URL("../docs/demo.js", import.meta.url), "utf8");
  assert.match(demo, /\["light", "dark"\]/, "官网演示应支持明暗主题视觉回归");
});

test("弹窗和设置页保持运行时依赖的控件 ID", async () => {
  const popup = parseHTML(
    await readFile(new URL("../src/popup.html", import.meta.url), "utf8"),
  ).document;
  for (const id of ["status-dot", "status-title", "status-detail", "translate", "settings"]) {
    assert.ok(popup.querySelector(`#${id}`), `popup 缺少 #${id}`);
  }

  const options = parseHTML(
    await readFile(new URL("../src/options.html", import.meta.url), "utf8"),
  ).document;
  for (const id of ["enhanced", "provider-settings", "model", "api-key", "test", "save", "message"]) {
    assert.ok(options.querySelector(`#${id}`), `options 缺少 #${id}`);
  }
});

test("所有界面共享 rpl 视觉令牌并支持减少动态效果", async () => {
  for (const path of ["docs/styles.css", "src/popup.css", "src/options.css"]) {
    const css = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(css, /--rpl-accent:\s*#287f78/i, `${path} 缺少品牌令牌`);
    assert.match(css, /--rpl-motion:\s*160ms/i, `${path} 动效时长不是 160ms`);
    assert.match(css, /prefers-reduced-motion:\s*reduce/i, `${path} 未适配减少动态效果`);
    assert.doesNotMatch(css, /url\s*\(/i, `${path} 不应加载远程字体或图片`);
  }
});

test("GitHub 悬浮控件保持 Shadow DOM、276px 面板和免费本地说明", async () => {
  const source = await readFile(new URL("../src/content.ts", import.meta.url), "utf8");
  assert.match(source, /attachShadow\(\{ mode: "closed" \}\)/);
  assert.match(source, /\.panel \{ width: 276px;/);
  assert.match(source, /免费本地模式/);
  assert.match(source, /--rpl-motion: 160ms/);
});
