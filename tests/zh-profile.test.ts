import assert from "node:assert/strict";
import test from "node:test";
import { finalizeTranslation, zhHansProfile } from "../src/core/zh-profile";

test("保护代码、URL、版本号、SHA 与固定术语", () => {
  const source =
    "This Pull Request updates React to v19.1.0 at https://example.com and keeps 7f3a9bc unchanged.";
  const protectedText = zhHansProfile.protect(source);

  assert.ok(protectedText.tokens.length >= 5);
  assert.ok(!protectedText.text.includes("https://example.com"));

  const translated = `此 ${protectedText.text
    .replace("This ", "")
    .replace(" updates ", " 将 ")
    .replace(" to ", " 更新到 ")
    .replace(" at ", "，详见 ")
    .replace(" and keeps ", "，并保持 ")
    .replace(" unchanged.", " 不变。")}`;
  const result = finalizeTranslation(source, translated, protectedText);

  assert.equal(result.validation.valid, true);
  assert.match(result.text, /Pull Request（拉取请求）/);
  assert.match(result.text, /React/);
  assert.match(result.text, /v19\.1\.0/);
  assert.match(result.text, /https:\/\/example\.com/);
  assert.match(result.text, /7f3a9bc/);
});

test("占位符缺失或重复时拒绝可疑译文", () => {
  const source = "Run npm install before opening the API endpoint.";
  const protectedText = zhHansProfile.protect(source);
  assert.ok(protectedText.tokens.length > 0);

  const missing = finalizeTranslation(source, "运行前请先安装依赖。", protectedText);
  assert.equal(missing.validation.valid, false);
  assert.equal(missing.text, source);

  const duplicated = finalizeTranslation(
    source,
    `${protectedText.text} ${protectedText.tokens[0]!.placeholder}`,
    protectedText,
  );
  assert.equal(duplicated.validation.valid, false);
  assert.equal(duplicated.text, source);
});

test("规范化简体中文标点与中英文间距", () => {
  const normalized = zhHansProfile.normalize("使用API,然后运行Docker;;  完成!!");
  assert.equal(normalized, "使用 API，然后运行 Docker；完成！");
});

test("明显不是中文或长度异常的译文不通过质量门禁", () => {
  assert.equal(
    zhHansProfile.validate("This sentence should be translated.", "Still English", []).valid,
    false,
  );
  assert.equal(
    zhHansProfile.validate("This sentence should be translated.", "中", []).valid,
    false,
  );
});
