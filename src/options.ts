import { DEFAULT_SETTINGS, mergeSettings } from "./shared/settings";
import { sendRuntimeMessage } from "./shared/runtime";
import {
  PROVIDER_ORIGINS,
  type AppSettings,
  type ProviderId,
} from "./shared/types";

const enhanced = required<HTMLInputElement>("#enhanced");
const providerSettings = required<HTMLElement>("#provider-settings");
const model = required<HTMLInputElement>("#model");
const apiKey = required<HTMLInputElement>("#api-key");
const message = required<HTMLElement>("#message");
const providerInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>("input[name='provider']"),
);
let settings: AppSettings = structuredClone(DEFAULT_SETTINGS);
let provider: ProviderId = "openai";

void load();

enhanced.addEventListener("change", () => {
  providerSettings.hidden = !enhanced.checked;
  if (enhanced.checked) renderProvider();
});

for (const input of providerInputs) {
  input.addEventListener("change", () => {
    stashProvider();
    provider = input.value as ProviderId;
    renderProvider();
  });
}

required<HTMLButtonElement>("#save").addEventListener("click", () => void save(false));
required<HTMLButtonElement>("#test").addEventListener("click", () => void save(true));

async function load(): Promise<void> {
  try {
    settings = mergeSettings(
      await sendRuntimeMessage<AppSettings>({ type: "settings:getPrivate" }),
    );
    provider = settings.engine === "local" ? "openai" : settings.engine;
    enhanced.checked = settings.engine !== "local";
    providerSettings.hidden = !enhanced.checked;
    renderProvider();
  } catch (error) {
    showMessage(errorMessage(error), true);
  }
}

function renderProvider(): void {
  for (const input of providerInputs) input.checked = input.value === provider;
  const config = settings.providers[provider];
  model.value = config.model;
  apiKey.value = config.apiKey;
}

function stashProvider(): void {
  settings.providers[provider] = {
    ...settings.providers[provider],
    model: model.value.trim() || settings.providers[provider].model,
    apiKey: apiKey.value.trim(),
  };
}

async function save(testAfterSave: boolean): Promise<void> {
  stashProvider();
  if (enhanced.checked) {
    if (!settings.providers[provider].apiKey) {
      showMessage("请输入所选服务的 API Key。", true);
      apiKey.focus();
      return;
    }
    const granted = await chrome.permissions.request({
      origins: [PROVIDER_ORIGINS[provider]],
    });
    if (!granted) {
      showMessage("未获得服务域名权限，增强翻译仍保持关闭。", true);
      return;
    }
    settings.engine = provider;
    settings.providers[provider].enabled = true;
  } else {
    settings.engine = "local";
  }

  try {
    await sendRuntimeMessage({ type: "settings:savePrivate", settings });
    if (testAfterSave && enhanced.checked) {
      showMessage("正在测试连接…");
      const result = await sendRuntimeMessage<string>({
        type: "provider:test",
        provider,
      });
      showMessage(`连接成功：${result}`);
    } else {
      showMessage(enhanced.checked ? "增强翻译设置已保存。" : "已恢复为默认本地翻译。 ");
    }
  } catch (error) {
    showMessage(errorMessage(error), true);
  }
}

function showMessage(text: string, isError = false): void {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "设置保存失败";
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少界面元素 ${selector}`);
  return element;
}
