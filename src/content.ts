import { LocalTranslationEngine } from "./core/local-engine";
import {
  getRepositoryKey,
  renderTemplate,
  scanPage,
  type ScannedUnit,
} from "./core/page-scanner";
import { finalizeTranslation, zhHansProfile } from "./core/zh-profile";
import { sendRuntimeMessage } from "./shared/runtime";
import type {
  DisplayMode,
  EngineId,
  ProtectedText,
  PublicSettings,
  TranslationBatchResponse,
  TranslationUnit,
} from "./shared/types";

interface TranslationRecord {
  scanned: ScannedUnit;
  original: HTMLSpanElement;
  translated: HTMLSpanElement;
  button: HTMLButtonElement | null;
  override: "original" | "translated" | null;
}

interface PreparedUnit {
  scanned: ScannedUnit;
  protectedText: ProtectedText;
  unit: TranslationUnit;
}

const HOST_ID = "repolingo-root";
const PAGE_STYLE_ID = "repolingo-page-style";
const localEngine = new LocalTranslationEngine();
const records = new Map<HTMLElement, TranslationRecord>();
let settings: PublicSettings | null = null;
let mode: DisplayMode = "original";
let activeController: AbortController | null = null;
let currentUrl = location.href;
let mutationTimer: number | null = null;
let translating = false;
let ui: ReturnType<typeof createUi>;

async function initialize(): Promise<void> {
  try {
    settings = await sendRuntimeMessage<PublicSettings>({ type: "settings:getPublic" });
    const repository = getRepositoryKey();
    const remembered = repository ? settings.repositoryModes[repository] : undefined;
    ui.remember.checked = Boolean(remembered);
    ui.engine.textContent = engineLabel(settings.engine);
    setMode(remembered ?? "original", false);
    await refreshAvailability();
    if (remembered && remembered !== "original") {
      const availability = await localEngine.availability();
      if (settings.engine !== "local" || availability === "available") {
        await startTranslation(remembered);
      } else {
        setStatus("点击开始准备本地翻译", "idle");
      }
    }
  } catch (error) {
    setStatus(errorMessage(error), "error");
  }
}

async function refreshAvailability(): Promise<void> {
  if (!settings || settings.engine !== "local") {
    setStatus(settings ? `${engineLabel(settings.engine)} · 已选择` : "正在读取设置", "idle");
    return;
  }
  const availability = await localEngine.availability();
  if (availability === "available") setStatus("本地翻译 · 已就绪", "ready");
  else if (availability === "downloadable") setStatus("本地语言包 · 可下载", "idle");
  else setStatus("浏览器不支持本地翻译", "error");
}

async function handlePrimaryToggle(): Promise<void> {
  if (translating) {
    activeController?.abort();
    setStatus("翻译已取消", "idle");
    return;
  }
  if (mode === "original") {
    if (records.size === 0) await startTranslation("translated");
    else setMode("translated");
  } else {
    setMode("original");
  }
}

async function startTranslation(targetMode: DisplayMode, onlyNew = false): Promise<void> {
  if (!settings || translating) return;
  const scanned = scanPage().filter((item) => !records.has(item.element));
  if (scanned.length === 0) {
    if (records.size > 0) setMode(targetMode);
    else setStatus("当前页面没有可翻译内容", "idle");
    return;
  }

  translating = true;
  ui.primary.disabled = false;
  ui.primary.dataset.busy = "true";
  activeController?.abort();
  activeController = new AbortController();
  const signal = activeController.signal;

  try {
    const prepared = scanned.map(prepareUnit);
    let rawResults: Map<string, string>;

    if (settings.engine === "local") {
      const availability = await localEngine.availability();
      if (availability === "unavailable") {
        throw new Error("当前浏览器不支持本地翻译。请升级 Chrome 或 Edge，或在设置中主动启用增强翻译。");
      }
      if (availability === "downloadable") {
        setStatus("正在准备本地语言包 · 0%", "working");
        await localEngine.prepare((progress) => {
          setStatus(`正在准备本地语言包 · ${Math.round(progress * 100)}%`, "working");
        });
      }
      setStatus(`正在本地翻译 · 0/${prepared.length}`, "working");
      rawResults = await localEngine.translate(
        prepared.map((item) => item.unit),
        signal,
        (done, total) => setStatus(`正在本地翻译 · ${done}/${total}`, "working"),
      );
    } else {
      if (!settings.configuredProviders[settings.engine]) {
        throw new Error("请先在增强翻译设置中配置所选服务；本地翻译仍可直接使用。");
      }
      setStatus(`正在使用 ${engineLabel(settings.engine)} 增强翻译`, "working");
      rawResults = await translateEnhanced(prepared, settings.engine, signal);
    }

    let accepted = 0;
    let rejected = 0;
    for (const item of prepared) {
      const raw = rawResults.get(item.unit.id);
      if (!raw) {
        rejected += 1;
        continue;
      }
      const finalized = finalizeTranslation(
        item.scanned.unit.text,
        raw,
        item.protectedText,
      );
      if (!finalized.validation.valid) {
        rejected += 1;
        continue;
      }
      attachTranslation(item.scanned, finalized.text);
      accepted += 1;
    }

    if (!onlyNew || mode !== "original") setMode(targetMode);
    setStatus(
      rejected > 0
        ? `已翻译 ${accepted} 段，${rejected} 段保留原文`
        : `已翻译 ${accepted} 段 · 可随时核验原文`,
      rejected > 0 ? "idle" : "ready",
    );
  } catch (error) {
    if ((error as { name?: string }).name !== "AbortError") {
      setStatus(errorMessage(error), "error");
    }
  } finally {
    translating = false;
    ui.primary.dataset.busy = "false";
  }
}

function prepareUnit(scanned: ScannedUnit): PreparedUnit {
  const protectedText = zhHansProfile.protect(scanned.unit.text);
  return {
    scanned,
    protectedText,
    unit: {
      ...scanned.unit,
      text: protectedText.text,
      protectedTokens: protectedText.tokens.map((token) => token.original),
    },
  };
}

async function translateEnhanced(
  prepared: PreparedUnit[],
  engine: Exclude<EngineId, "local">,
  signal: AbortSignal,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const batch of createBatches(prepared)) {
    if (signal.aborted) throw new DOMException("翻译已取消", "AbortError");
    const response = await sendRuntimeMessage<TranslationBatchResponse>({
      type: "translate:enhanced",
      provider: engine,
      units: batch.map((item) => item.unit),
    });
    for (const translation of response.translations) {
      result.set(translation.id, translation.text);
    }
    setStatus(`增强翻译已完成 ${result.size}/${prepared.length} 段`, "working");
  }
  return result;
}

function createBatches(items: PreparedUnit[]): PreparedUnit[][] {
  const batches: PreparedUnit[][] = [];
  let current: PreparedUnit[] = [];
  let characters = 0;
  for (const item of items) {
    const nextLength = item.unit.text.length;
    if (current.length >= 20 || (current.length > 0 && characters + nextLength > 6000)) {
      batches.push(current);
      current = [];
      characters = 0;
    }
    current.push(item);
    characters += nextLength;
  }
  if (current.length) batches.push(current);
  return batches;
}

function attachTranslation(scanned: ScannedUnit, text: string): void {
  const element = scanned.element;
  if (records.has(element) || !element.isConnected) return;

  const original = document.createElement("span");
  original.className = "repolingo-original";
  while (element.firstChild) original.append(element.firstChild);

  const translated = document.createElement("span");
  translated.className = "repolingo-translated";
  translated.lang = "zh-Hans";
  translated.append(renderTemplate(text, scanned.slots));

  element.append(original, translated);
  element.dataset.repolingoUnit = scanned.unit.id;
  element.classList.add("repolingo-unit-shell");

  let button: HTMLButtonElement | null = null;
  if (!element.matches("td,th")) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "repolingo-block-toggle";
    button.textContent = "EN";
    button.title = "只切换这一段";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const record = records.get(element);
      if (!record) return;
      const effective = record.override ?? (mode === "original" ? "original" : "translated");
      record.override = effective === "original" ? "translated" : "original";
      applyRecordMode(record);
    });
    element.append(button);
  }

  const record: TranslationRecord = {
    scanned,
    original,
    translated,
    button,
    override: null,
  };
  records.set(element, record);
  applyRecordMode(record);
}

function setMode(nextMode: DisplayMode, persist = true): void {
  mode = nextMode;
  ui.primary.dataset.mode = nextMode;
  ui.bilingual.checked = nextMode === "bilingual";
  ui.primary.setAttribute(
    "aria-label",
    nextMode === "original" ? "切换到中文译文" : "切换到英文原文",
  );
  for (const record of records.values()) {
    record.override = null;
    applyRecordMode(record);
  }
  if (persist) void persistMode();
}

function applyRecordMode(record: TranslationRecord): void {
  const effective = record.override ?? mode;
  record.scanned.element.dataset.repolingoMode = effective;
  if (record.button) {
    record.button.textContent = effective === "original" ? "中" : "EN";
    record.button.setAttribute(
      "aria-label",
      effective === "original" ? "显示本段译文" : "显示本段原文",
    );
  }
}

async function persistMode(): Promise<void> {
  if (!settings) return;
  const repository = getRepositoryKey();
  settings = await sendRuntimeMessage<PublicSettings>({
    type: "settings:updateDisplay",
    mode,
    repository,
    remember: ui.remember.checked,
  });
}

function restorePage(): void {
  for (const record of records.values()) {
    const element = record.scanned.element;
    if (!element.isConnected) continue;
    record.button?.remove();
    record.translated.remove();
    while (record.original.firstChild) {
      element.insertBefore(record.original.firstChild, record.original);
    }
    record.original.remove();
    element.classList.remove("repolingo-unit-shell");
    delete element.dataset.repolingoUnit;
    delete element.dataset.repolingoMode;
  }
  records.clear();
}

function handleNavigation(): void {
  if (location.href === currentUrl) return;
  currentUrl = location.href;
  activeController?.abort();
  restorePage();
  mode = "original";
  ui.primary.dataset.mode = "original";
  void initialize();
}

function scheduleDynamicScan(mutations: MutationRecord[]): void {
  handleNavigation();
  if (mode === "original" || records.size === 0 || translating) return;
  const hasExternalNodes = mutations.some((mutation) =>
    Array.from(mutation.addedNodes).some(
      (node) =>
        node instanceof Element &&
        !node.closest(`#${HOST_ID}, [data-repolingo-unit]`),
    ),
  );
  if (!hasExternalNodes) return;
  if (mutationTimer !== null) window.clearTimeout(mutationTimer);
  mutationTimer = window.setTimeout(() => {
    mutationTimer = null;
    void startTranslation(mode, true);
  }, 500);
}

const observer = new MutationObserver(scheduleDynamicScan);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener("popstate", handleNavigation);
document.addEventListener("turbo:load", handleNavigation);

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== "object" || !("type" in message)) return;
  const request = message as { type: string; mode?: DisplayMode };
  if (request.type === "repolingo:toggle") {
    void handlePrimaryToggle().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (
    request.type === "repolingo:setMode" &&
    (request.mode === "original" ||
      request.mode === "translated" ||
      request.mode === "bilingual")
  ) {
    if (records.size === 0 && request.mode !== "original") {
      void startTranslation(request.mode).then(() => sendResponse({ ok: true }));
    } else {
      setMode(request.mode);
      sendResponse({ ok: true });
    }
    return true;
  }
  if (request.type === "repolingo:getStatus") {
    sendResponse({ ok: true, mode, translatedBlocks: records.size, translating });
  }
});

function engineLabel(engine: EngineId): string {
  if (engine === "local") return "本地翻译";
  if (engine === "openai") return "OpenAI 增强";
  if (engine === "gemini") return "Gemini 增强";
  return "DeepSeek 增强";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "翻译失败，请稍后重试";
}

function setStatus(text: string, state: "idle" | "ready" | "working" | "error"): void {
  ui.status.textContent = text;
  ui.statusDot.dataset.state = state;
}

function createUi() {
  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>${controlStyles}</style>
    <div class="dock" role="region" aria-label="RepoLingo 翻译控制">
      <div class="bar">
        <button class="language-switch" id="primary" type="button" data-mode="original" aria-label="切换到中文译文">
          <span class="label label-zh">中文</span>
          <span class="bridge" aria-hidden="true"><i></i></span>
          <span class="label label-en">EN</span>
        </button>
        <button class="menu-button" id="menu" type="button" aria-expanded="false" aria-controls="panel" aria-label="展开 RepoLingo 设置">
          <span></span><span></span><span></span>
        </button>
      </div>
      <section class="panel" id="panel" hidden>
        <header>
          <div class="mark">R</div>
          <div><strong>RepoLingo</strong><small>本地优先，原文随时可见</small></div>
        </header>
        <div class="status-row" role="status" aria-live="polite"><i id="status-dot" data-state="idle"></i><span id="status">正在检查本地翻译</span></div>
        <label class="option-row">
          <span><strong>双语对照</strong><small>同时显示英文与中文</small></span>
          <input id="bilingual" type="checkbox"><i class="toggle" aria-hidden="true"></i>
        </label>
        <label class="option-row">
          <span><strong>记住当前仓库</strong><small>下次沿用显示方式</small></span>
          <input id="remember" type="checkbox"><i class="toggle" aria-hidden="true"></i>
        </label>
        <button class="engine-row" id="settings" type="button">
          <span><small>翻译方式</small><strong id="engine">本地翻译</strong></span>
          <span class="arrow" aria-hidden="true">→</span>
        </button>
        <p class="privacy"><strong>免费本地模式</strong><span>页面内容默认不会离开浏览器。</span></p>
      </section>
    </div>`;
  document.documentElement.append(host);

  const primary = required<HTMLButtonElement>(shadow, "#primary");
  const menu = required<HTMLButtonElement>(shadow, "#menu");
  const panel = required<HTMLElement>(shadow, "#panel");
  const bilingual = required<HTMLInputElement>(shadow, "#bilingual");
  const remember = required<HTMLInputElement>(shadow, "#remember");
  const status = required<HTMLElement>(shadow, "#status");
  const statusDot = required<HTMLElement>(shadow, "#status-dot");
  const engine = required<HTMLElement>(shadow, "#engine");
  const settingsButton = required<HTMLButtonElement>(shadow, "#settings");

  primary.addEventListener("click", () => void handlePrimaryToggle());
  menu.addEventListener("click", () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    menu.setAttribute("aria-expanded", String(!isOpen));
  });
  shadow.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      menu.setAttribute("aria-expanded", "false");
      menu.focus();
    }
  });
  bilingual.addEventListener("change", () => {
    if (bilingual.checked) {
      if (records.size === 0) void startTranslation("bilingual");
      else setMode("bilingual");
    } else {
      setMode(records.size ? "translated" : "original");
    }
  });
  remember.addEventListener("change", () => void persistMode());
  settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

  return { host, shadow, primary, menu, panel, bilingual, remember, status, statusDot, engine };
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`RepoLingo 控件缺少 ${selector}`);
  return element;
}

function injectPageStyle(): void {
  document.getElementById(PAGE_STYLE_ID)?.remove();
  const style = document.createElement("style");
  style.id = PAGE_STYLE_ID;
  style.textContent = `
    [data-repolingo-unit] > .repolingo-original,
    [data-repolingo-unit] > .repolingo-translated { display: contents; }
    [data-repolingo-unit][data-repolingo-mode="original"] > .repolingo-translated { display: none; }
    [data-repolingo-unit][data-repolingo-mode="translated"] > .repolingo-original { display: none; }
    [data-repolingo-unit][data-repolingo-mode="bilingual"] > .repolingo-translated {
      display: block;
      margin-top: .48em;
      padding-left: .78em;
      border-left: 2px solid #287f78;
      color: var(--fgColor-muted, #59636e);
    }
    .repolingo-unit-shell { position: relative; }
    .repolingo-block-toggle {
      position: absolute;
      z-index: 2;
      top: 0;
      right: -2.1rem;
      min-width: 2rem;
      height: 1.75rem;
      padding: 0 .38rem;
      border: 1px solid var(--borderColor-default, #d1d9e0);
      border-radius: .42rem;
      background: var(--bgColor-default, #fff);
      color: #287f78;
      font: 650 12px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
      opacity: 0;
      cursor: pointer;
      transition: opacity 160ms ease, transform 160ms ease;
      transform: translateX(-3px);
    }
    .repolingo-unit-shell:hover > .repolingo-block-toggle,
    .repolingo-block-toggle:focus-visible { opacity: 1; transform: translateX(0); }
    .repolingo-block-toggle:focus-visible { outline: 2px solid #287f78; outline-offset: 2px; }
    @media (max-width: 900px) { .repolingo-block-toggle { right: 0; } }
    @media (prefers-reduced-motion: reduce) { .repolingo-block-toggle { transition: none; } }
  `;
  document.head.append(style);
}

const controlStyles = `
  :host {
    --rpl-canvas: #f7faf9;
    --rpl-surface: rgba(255, 255, 255, .95);
    --rpl-text-primary: #17202a;
    --rpl-text-secondary: #66707b;
    --rpl-border: rgba(23, 32, 42, .15);
    --rpl-accent: #287f78;
    --rpl-accent-bright: #45b8ad;
    --rpl-accent-soft: rgba(40, 127, 120, .08);
    --rpl-motion: 160ms cubic-bezier(.2, .8, .2, 1);
    --ink: var(--rpl-text-primary);
    --porcelain: var(--rpl-canvas);
    --celadon: var(--rpl-accent);
    --celadon-bright: var(--rpl-accent-bright);
    --line: var(--rpl-border);
    --muted: var(--rpl-text-secondary);
    --surface: var(--rpl-surface);
    position: fixed;
    z-index: 2147483000;
    top: 82px;
    right: 18px;
    color-scheme: light dark;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei UI", "PingFang SC", sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --rpl-canvas: #111820;
      --rpl-surface: rgba(13, 17, 23, .95);
      --rpl-text-primary: #f0f3f5;
      --rpl-text-secondary: #9aa5b1;
      --rpl-border: rgba(255, 255, 255, .16);
      --rpl-accent-soft: rgba(69, 184, 173, .1);
    }
    .mark { color: #0d1117; }
  }
  button, input { font: inherit; }
  button { touch-action: manipulation; }
  button { color: inherit; }
  .dock { width: 300px; display: flex; flex-direction: column; align-items: flex-end; filter: drop-shadow(0 16px 34px rgba(23, 32, 42, .16)); }
  .bar { display: flex; align-items: center; padding: 4px; border: 1px solid var(--line); border-radius: 15px; background: var(--surface); backdrop-filter: blur(18px) saturate(1.15); }
  .language-switch, .menu-button, .engine-row { border: 0; background: transparent; cursor: pointer; }
  .language-switch { position: relative; display: grid; grid-template-columns: 45px 30px 34px; align-items: center; height: 38px; padding: 0 7px; border-radius: 11px; }
  .language-switch:focus-visible, .menu-button:focus-visible, .engine-row:focus-visible { outline: 2px solid var(--celadon-bright); outline-offset: 2px; }
  .label { position: relative; z-index: 1; color: var(--muted); font-size: 12px; font-weight: 650; letter-spacing: .01em; transition: color var(--rpl-motion); }
  .language-switch[data-mode="original"] .label-en,
  .language-switch[data-mode="translated"] .label-zh,
  .language-switch[data-mode="bilingual"] .label-zh { color: var(--porcelain); }
  .language-switch::before { content: ""; position: absolute; top: 3px; bottom: 3px; width: 47px; border-radius: 9px; background: var(--celadon); transition: transform var(--rpl-motion), width var(--rpl-motion), opacity var(--rpl-motion); }
  .language-switch[data-mode="original"]::before { transform: translateX(72px); width: 39px; }
  .language-switch[data-mode="translated"]::before { transform: translateX(0); }
  .language-switch[data-mode="bilingual"]::before { transform: translateX(0); width: 109px; opacity: .94; }
  .bridge { position: relative; z-index: 1; height: 1px; background: var(--celadon-bright); opacity: .65; }
  .bridge i { position: absolute; width: 5px; height: 5px; top: -2px; left: 11px; border-radius: 50%; background: var(--celadon-bright); }
  .language-switch[data-busy="true"] .bridge i { animation: travel 900ms ease-in-out infinite alternate; }
  @keyframes travel { to { transform: translateX(9px); } }
  .menu-button { display: grid; place-content: center; gap: 3px; width: 36px; height: 36px; border-radius: 10px; transition: background var(--rpl-motion); }
  .menu-button:hover { background: var(--rpl-accent-soft); }
  .menu-button span { width: 3px; height: 3px; border-radius: 50%; background: var(--muted); }
  .panel { width: 276px; margin-top: 8px; padding: 17px; border: 1px solid var(--line); border-radius: 17px; background: var(--surface); backdrop-filter: blur(20px) saturate(1.15); animation: panel-in var(--rpl-motion) both; }
  .panel[hidden] { display: none; }
  header { display: flex; gap: 11px; align-items: center; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
  .mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: #fff; background: var(--ink); font-weight: 760; box-shadow: inset 0 -3px 0 var(--celadon); }
  header strong { display: block; color: var(--ink); font-size: 14px; letter-spacing: -.01em; }
  small { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; line-height: 1.35; }
  .status-row { display: flex; gap: 9px; align-items: center; min-height: 48px; color: var(--muted); font-size: 12px; border-bottom: 1px solid var(--line); }
  .status-row i { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: #8c959f; }
  .status-row i[data-state="ready"] { background: var(--celadon-bright); box-shadow: 0 0 0 3px rgba(69,184,173,.14); }
  .status-row i[data-state="working"] { background: #b7791f; animation: pulse 1s ease infinite; }
  .status-row i[data-state="error"] { background: #d1242f; }
  @keyframes pulse { 50% { opacity: .42; } }
  .option-row { position: relative; display: flex; align-items: center; justify-content: space-between; min-height: 56px; cursor: pointer; }
  .option-row + .option-row { border-top: 1px solid var(--line); }
  .option-row strong { color: var(--ink); font-size: 13px; font-weight: 620; }
  .option-row input { position: absolute; opacity: 0; pointer-events: none; }
  .toggle { position: relative; width: 34px; height: 20px; border-radius: 99px; background: rgba(102,112,123,.28); transition: background var(--rpl-motion); }
  .toggle::after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.24); transition: transform var(--rpl-motion); }
  input:checked + .toggle { background: var(--celadon); }
  input:checked + .toggle::after { transform: translateX(14px); }
  input:focus-visible + .toggle { outline: 2px solid var(--celadon-bright); outline-offset: 2px; }
  .engine-row { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 54px; padding: 0; border-top: 1px solid var(--line); text-align: left; }
  .engine-row strong { color: var(--ink); font-size: 13px; font-weight: 650; }
  .engine-row .arrow { color: var(--celadon); transition: transform var(--rpl-motion); }
  .engine-row:hover .arrow { transform: translateX(3px); }
  .privacy { margin: 3px 0 0; padding: 10px 11px; border-radius: 10px; color: var(--muted); background: var(--rpl-accent-soft); font-size: 12px; line-height: 1.5; }
  .privacy strong, .privacy span { display: block; }
  .privacy strong { margin-bottom: 2px; color: var(--ink); font-size: 12px; }
  @keyframes panel-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 720px) { :host { top: auto; right: 12px; bottom: 16px; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

ui = createUi();
injectPageStyle();
void initialize();
