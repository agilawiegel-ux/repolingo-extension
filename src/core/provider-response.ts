import type { TranslationBatchResponse, TranslationUnit } from "../shared/types";

export function parseBatchResponse(
  raw: string,
  units: TranslationUnit[],
): TranslationBatchResponse {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("翻译服务未返回有效 JSON");
  }
  if (!parsed || typeof parsed !== "object" || !("translations" in parsed)) {
    throw new Error("翻译服务返回结构无效");
  }

  const translations = (parsed as { translations?: unknown }).translations;
  if (!Array.isArray(translations)) throw new Error("翻译列表无效");

  const expectedIds = new Set(units.map((unit) => unit.id));
  const byId = new Map<string, string>();
  for (const item of translations) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    const text = (item as { text?: unknown }).text;
    if (typeof id !== "string" || typeof text !== "string" || !expectedIds.has(id)) {
      continue;
    }
    if (byId.has(id)) throw new Error("翻译结果包含重复段落");
    byId.set(id, text);
  }

  if (byId.size !== units.length) throw new Error("翻译结果不完整");
  return {
    translations: units.map((unit) => ({
      id: unit.id,
      text: byId.get(unit.id) ?? "",
    })),
  };
}
