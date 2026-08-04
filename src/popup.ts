type PageStatus = {
  ok?: boolean;
  mode?: "original" | "translated" | "bilingual";
  translatedBlocks?: number;
  translating?: boolean;
};

const title = required<HTMLElement>("#status-title");
const detail = required<HTMLElement>("#status-detail");
const dot = required<HTMLElement>("#status-dot");
const translate = required<HTMLButtonElement>("#translate");
const modeButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-mode]"),
);

let activeTabId: number | undefined;
let pageStatus: PageStatus | null = null;

void refresh();

translate.addEventListener("click", async () => {
  if (!activeTabId) return;
  translate.disabled = true;
  title.textContent = "正在处理当前页面";
  dot.className = "working";
  try {
    await chrome.tabs.sendMessage(activeTabId, { type: "repolingo:toggle" });
    await refresh();
  } catch {
    showUnsupported();
  } finally {
    translate.disabled = false;
  }
});

for (const button of modeButtons) {
  button.addEventListener("click", async () => {
    if (!activeTabId) return;
    const mode = button.dataset.mode;
    try {
      await chrome.tabs.sendMessage(activeTabId, {
        type: "repolingo:setMode",
        mode,
      });
      await refresh();
    } catch {
      showUnsupported();
    }
  });
}

required<HTMLButtonElement>("#settings").addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

async function refresh(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const active = tabs[0];
  activeTabId = active?.id;
  if (!active || !activeTabId || !active.url?.startsWith("https://github.com/")) {
    showUnsupported();
    return;
  }
  try {
    pageStatus = (await chrome.tabs.sendMessage(activeTabId, {
      type: "repolingo:getStatus",
    })) as PageStatus;
    dot.className = pageStatus.translating ? "working" : "ready";
    title.textContent = pageStatus.translating ? "正在翻译" : "RepoLingo 已连接";
    detail.textContent = pageStatus.translatedBlocks
      ? `当前页面已有 ${pageStatus.translatedBlocks} 个译文段落`
      : "默认使用浏览器本地翻译";
    translate.textContent = pageStatus.mode === "original" ? "翻译当前页面" : "显示英文原文";
    for (const button of modeButtons) {
      const active = button.dataset.mode === pageStatus.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
  } catch {
    showUnsupported();
  }
}

function showUnsupported(): void {
  dot.className = "";
  title.textContent = "请打开 GitHub 页面";
  detail.textContent = "RepoLingo 只在 github.com 上运行";
  translate.disabled = true;
  for (const button of modeButtons) {
    button.disabled = true;
    button.setAttribute("aria-pressed", "false");
  }
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少界面元素 ${selector}`);
  return element;
}
