import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  toPublicSettings,
} from "../src/shared/settings";

test("首次安装默认使用本地翻译，三家增强服务全部关闭", () => {
  assert.equal(DEFAULT_SETTINGS.engine, "local");
  assert.equal(DEFAULT_SETTINGS.providers.openai.enabled, false);
  assert.equal(DEFAULT_SETTINGS.providers.gemini.enabled, false);
  assert.equal(DEFAULT_SETTINGS.providers.deepseek.enabled, false);
  assert.equal(DEFAULT_SETTINGS.providers.openai.apiKey, "");
});

test("内容脚本可见设置不包含任何 API Key", () => {
  const settings = mergeSettings({
    engine: "openai",
    providers: {
      openai: { enabled: true, model: "custom-model", apiKey: "secret-key" },
    },
  });
  const publicSettings = toPublicSettings(settings);
  assert.equal(publicSettings.engine, "openai");
  assert.equal(publicSettings.configuredProviders.openai, true);
  assert.equal("providers" in publicSettings, false);
  assert.equal(JSON.stringify(publicSettings).includes("secret-key"), false);
});

test("损坏或缺失的设置安全回退到本地翻译", () => {
  const settings = mergeSettings({ engine: "unknown", displayMode: "invalid" });
  assert.equal(settings.engine, "local");
  assert.equal(settings.displayMode, "original");
});
