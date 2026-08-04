export type DisplayMode = "original" | "translated" | "bilingual";
export type EngineId = "local" | "openai" | "gemini" | "deepseek";
export type ProviderId = Exclude<EngineId, "local">;
export type PageContext =
  | "readme"
  | "issue"
  | "pull_request"
  | "discussion"
  | "release";

export interface TranslationUnit {
  id: string;
  text: string;
  context: PageContext;
  protectedTokens: string[];
}

export interface ProviderConfig {
  enabled: boolean;
  model: string;
  apiKey: string;
}

export interface AppSettings {
  displayMode: DisplayMode;
  engine: EngineId;
  rememberCurrentRepository: boolean;
  repositoryModes: Record<string, DisplayMode>;
  providers: Record<ProviderId, ProviderConfig>;
}

export interface PublicSettings
  extends Omit<AppSettings, "providers"> {
  configuredProviders: Record<ProviderId, boolean>;
}

export interface ProtectedToken {
  placeholder: string;
  original: string;
  replacement: string;
}

export interface ProtectedText {
  text: string;
  tokens: ProtectedToken[];
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface LocaleProfile {
  locale: "zh-Hans";
  protect(text: string): ProtectedText;
  restore(text: string, tokens: ProtectedToken[]): string | null;
  normalize(text: string): string;
  validate(
    source: string,
    translation: string,
    tokens: ProtectedToken[],
  ): ValidationResult;
}

export interface TranslationBatchResponse {
  translations: Array<{ id: string; text: string }>;
}

export const PROVIDER_ORIGINS: Record<ProviderId, string> = {
  openai: "https://api.openai.com/*",
  gemini: "https://generativelanguage.googleapis.com/*",
  deepseek: "https://api.deepseek.com/*",
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
};
