import assert from "node:assert/strict";
import test from "node:test";
import { parseHTML } from "linkedom";
import {
  detectPageContext,
  getRepositoryKey,
  renderTemplate,
  scanPage,
} from "../src/core/page-scanner";

function installDom(html: string, pathname: string) {
  const { document, window } = parseHTML(html);
  Object.assign(globalThis, {
    document,
    window,
    Node: window.Node,
    HTMLElement: window.HTMLElement,
    location: { pathname },
  });
  return document;
}

test("识别五类 GitHub 页面和仓库键", () => {
  assert.equal(detectPageContext("/owner/repo"), "readme");
  assert.equal(detectPageContext("/owner/repo/issues/12"), "issue");
  assert.equal(detectPageContext("/owner/repo/pull/3/files"), "pull_request");
  assert.equal(detectPageContext("/owner/repo/discussions/7"), "discussion");
  assert.equal(detectPageContext("/owner/repo/releases/tag/v1.0.0"), "release");
  assert.equal(getRepositoryKey("/owner/repo/issues/12"), "owner/repo");
  assert.equal(getRepositoryKey("/settings/profile"), null);
});

test("README 只抽取自然语言，保留链接和行内代码槽位", () => {
  const document = installDom(
    `<article class="markdown-body">
      <h2 id="install">Install the package</h2>
      <p>Run <code>npm install</code> and read <a href="/docs">the guide</a>.</p>
      <pre><code>const secret = "never translate";</code></pre>
      <table><tbody><tr><td>Supported platforms</td><td>Windows and Linux</td></tr></tbody></table>
    </article>`,
    "/owner/repo",
  );
  const units = scanPage(document);
  assert.equal(units.length, 4);
  assert.ok(units.some(({ unit }) => unit.text.includes("__RPL_DOM_0__")));
  assert.ok(units.every(({ unit }) => !unit.text.includes("never translate")));

  const paragraph = units.find(({ unit }) => unit.text.startsWith("Run"));
  assert.ok(paragraph);
  const fragment = renderTemplate(paragraph!.unit.text, paragraph!.slots);
  const host = document.createElement("div");
  host.append(fragment);
  assert.equal(host.querySelector("code")?.textContent, "npm install");
  assert.equal(host.querySelector("a")?.getAttribute("href"), "/docs");
});

test("PR Diff、输入框和操作控件不会进入翻译队列", () => {
  const document = installDom(
    `<div data-testid="issue-body">
      <p>This change fixes the timeout.</p>
      <div data-testid="diff-view"><p>Deleted implementation detail</p></div>
      <textarea>Write a comment in English</textarea>
      <button>Close pull request</button>
    </div>`,
    "/owner/repo/pull/9/files",
  );
  const units = scanPage(document);
  assert.deepEqual(units.map(({ unit }) => unit.text), ["This change fixes the timeout."]);
});
