import type {
  AppSettings,
  ProviderId,
  PublicSettings,
} from "./types";

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: "gpt-5.6-terra",
  gemini: "gemini-3.6-flash",
  deepseek: "deepseek-v4-flash",
};

export const DEFAULT_SETTINGS: AppSettings = {
  displayMode: "original",
  engine: "local",
  rememberCurrentRepository: false,
  repositoryModes: {},
  providers: {
    openai: { enabled: false, model: DEFAULT_MODELS.openai, apiKey: "" },
    gemini: { enabled: false, model: DEFAULT_MODELS.gemini, apiKey: "" },
    deepseek: {
      enabled: false,
      model: DEFAULT_MODELS.deepseek,
      apiKey: "",
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mergeSettings(value: unknown): AppSettings {
  if (!isRecord(value)) return structuredClone(DEFAULT_SETTINGS);
  const providers = isRecord(value.providers) ? value.providers : {};

  return {
    displayMode:
      value.displayMode === "translated" || value.displayMode === "bilingual"
        ? value.displayMode
        : "original",
    engine:
      value.engine === "openai" ||
      value.engine === "gemini" ||
      value.engine === "deepseek"
        ? value.engine
        : "local",
    rememberCurrentRepository: value.rememberCurrentRepository === true,
    repositoryModes: isRecord(value.repositoryModes)
      ? (value.repositoryModes as Record<string, AppSettings["displayMode"]>)
      : {},
    providers: {
      openai: mergeProvider(providers.openai, "openai"),
      gemini: mergeProvider(providers.gemini, "gemini"),
      deepseek: mergeProvider(providers.deepseek, "deepseek"),
    },
  };
}

function mergeProvider(value: unknown, provider: ProviderId) {
  const input = isRecord(value) ? value : {};
  return {
    enabled: input.enabled === true,
    model:
      typeof input.model === "string" && input.model.trim()
        ? input.model.trim()
        : DEFAULT_MODELS[provider],
    apiKey: typeof input.apiKey === "string" ? input.apiKey.trim() : "",
  };
}

export function toPublicSettings(settings: AppSettings): PublicSettings {
  return {
    displayMode: settings.displayMode,
    engine: settings.engine,
    rememberCurrentRepository: settings.rememberCurrentRepository,
    repositoryModes: settings.repositoryModes,
    configuredProviders: {
      openai:
        settings.providers.openai.enabled &&
        Boolean(settings.providers.openai.apiKey),
      gemini:
        settings.providers.gemini.enabled &&
        Boolean(settings.providers.gemini.apiKey),
      deepseek:
        settings.providers.deepseek.enabled &&
        Boolean(settings.providers.deepseek.apiKey),
    },
  };
}
