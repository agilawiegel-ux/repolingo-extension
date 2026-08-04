import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { zhHansProfile } from "../src/core/zh-profile";
import type { PageContext } from "../src/shared/types";

interface CorpusEntry {
  id: string;
  context: PageContext;
  source: string;
  target: string;
}

const corpus = JSON.parse(
  await readFile(new URL("../quality/corpus.json", import.meta.url), "utf8"),
) as CorpusEntry[];

test("审核语料包含五类页面且不少于 120 条", () => {
  assert.equal(corpus.length, 120);
  for (const context of ["readme", "issue", "pull_request", "discussion", "release"] as const) {
    assert.equal(corpus.filter((entry) => entry.context === context).length, 24);
  }
  assert.equal(new Set(corpus.map((entry) => entry.id)).size, corpus.length);
});

test("参考译文使用简体中文并完整保留受保护技术实体", () => {
  for (const entry of corpus) {
    assert.match(entry.source, /[A-Za-z]{2}/, `${entry.id} 缺少英文源文`);
    assert.match(entry.target, /[\u3400-\u9fff]/, `${entry.id} 缺少简体中文参考译文`);
    const protectedText = zhHansProfile.protect(entry.source);
    for (const token of protectedText.tokens) {
      assert.ok(
        entry.target.includes(token.replacement),
        `${entry.id} 未保留受保护内容：${token.replacement}`,
      );
    }
  }
});
