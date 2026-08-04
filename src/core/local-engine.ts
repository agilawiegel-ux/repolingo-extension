import type { TranslationUnit } from "../shared/types";

type Availability = "available" | "downloadable" | "unavailable";

interface TranslatorSession {
  translate(text: string): Promise<string>;
  destroy?: () => void;
}

interface TranslatorApi {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<TranslatorSession>;
}

function getTranslatorApi(): TranslatorApi | undefined {
  return (globalThis as typeof globalThis & { Translator?: TranslatorApi })
    .Translator;
}

export class LocalTranslationEngine {
  private session: TranslatorSession | null = null;

  async availability(): Promise<Availability> {
    const api = getTranslatorApi();
    if (!api) return "unavailable";
    const status = await api.availability({
      sourceLanguage: "en",
      targetLanguage: "zh",
    });
    if (status === "available") return "available";
    if (status === "downloadable" || status === "downloading") {
      return "downloadable";
    }
    return "unavailable";
  }

  async prepare(onProgress?: (value: number) => void): Promise<void> {
    if (this.session) return;
    const api = getTranslatorApi();
    if (!api) throw new Error("当前浏览器不支持本地翻译，请升级 Chrome 或 Edge。");
    this.session = await api.create({
      sourceLanguage: "en",
      targetLanguage: "zh",
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          const progressEvent = event as Event & { loaded?: number; total?: number };
          const loaded = progressEvent.loaded ?? 0;
          const total = progressEvent.total ?? 1;
          const value = total > 1 ? loaded / total : loaded;
          onProgress?.(Math.max(0, Math.min(1, value)));
        });
      },
    });
  }

  async translate(
    units: TranslationUnit[],
    signal: AbortSignal,
    onProgress?: (done: number, total: number) => void,
  ): Promise<Map<string, string>> {
    await this.prepare();
    if (!this.session) throw new Error("本地翻译器未就绪。");
    const results = new Map<string, string>();
    for (const [index, unit] of units.entries()) {
      if (signal.aborted) throw new DOMException("翻译已取消", "AbortError");
      results.set(unit.id, await this.session.translate(unit.text));
      onProgress?.(index + 1, units.length);
    }
    return results;
  }

  destroy(): void {
    this.session?.destroy?.();
    this.session = null;
  }
}
