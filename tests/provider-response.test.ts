import assert from "node:assert/strict";
import test from "node:test";
import { parseBatchResponse } from "../src/core/provider-response";
import type { TranslationUnit } from "../src/shared/types";

const units: TranslationUnit[] = [
  { id: "a", text: "First", context: "readme", protectedTokens: [] },
  { id: "b", text: "Second", context: "issue", protectedTokens: [] },
];

test("解析严格 JSON，并按源段落顺序返回", () => {
  const result = parseBatchResponse(
    '```json\n{"translations":[{"id":"b","text":"第二"},{"id":"a","text":"第一"}]}\n```',
    units,
  );
  assert.deepEqual(result.translations, [
    { id: "a", text: "第一" },
    { id: "b", text: "第二" },
  ]);
});

test("拒绝缺项、重复项和无效 JSON", () => {
  assert.throws(
    () => parseBatchResponse('{"translations":[{"id":"a","text":"第一"}]}', units),
    /不完整/,
  );
  assert.throws(
    () =>
      parseBatchResponse(
        '{"translations":[{"id":"a","text":"第一"},{"id":"a","text":"重复"}]}',
        units,
      ),
    /重复/,
  );
  assert.throws(() => parseBatchResponse("not json", units), /有效 JSON/);
});
