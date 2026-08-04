import type {
  LocaleProfile,
  ProtectedText,
  ProtectedToken,
  ValidationResult,
} from "../shared/types";

const GLOSSARY: Array<[RegExp, string]> = [
  [/\bGitHub Actions\b/g, "GitHub Actions"],
  [/\bPull Request\b/g, "Pull Request（拉取请求）"],
  [/\bIssue\b/g, "Issue（议题）"],
  [/\bFork\b/g, "Fork（派生）"],
  [/\bCommit\b/g, "Commit（提交）"],
  [/\bBranch\b/g, "Branch（分支）"],
  [/\bWorkflow\b/g, "Workflow（工作流）"],
  [/\bRunner\b/g, "Runner（执行器）"],
  [/\bRelease\b/g, "Release（版本发布）"],
  [/\b(?:API|SDK|CLI|CI|CD|DOM|JSON|YAML|HTTP|HTTPS|SSH|URL|URI)\b/g, "$&"],
  [/\b(?:React|Vue|Angular|Docker|Kubernetes|Node\.js|TypeScript|JavaScript|Python|Rust|Go)\b/g, "$&"],
];

const IMMUTABLE_PATTERNS: Array<{
  pattern: RegExp;
  trimSentencePunctuation?: boolean;
}> = [
  { pattern: /__RPL_DOM_\d+__/g },
  { pattern: /https?:\/\/[^\s<>"']+/gi, trimSentencePunctuation: true },
  { pattern: /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g },
  { pattern: /(?:^|\s)(--?[A-Za-z][\w-]*)(?=\s|$)/g },
  { pattern: /\bv?\d+\.\d+(?:\.\d+)?(?:-[\w.-]+)?\b/gi },
  { pattern: /\b[a-f0-9]{7,40}\b/gi },
  {
    pattern: /(?:\.{0,2}\/|\/|[A-Za-z]:\\)[^\s，。；：!?]+/g,
    trimSentencePunctuation: true,
  },
  { pattern: /@[a-z0-9._-]+\/[a-z0-9._-]+/gi },
  {
    pattern:
      /\b(?:[A-Za-z]+[A-Z][A-Za-z0-9]*|[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+)\b/g,
  },
];

function placeholder(index: number): string {
  return `⟦${index.toString(36).padStart(3, "0")}⟧`;
}

function protectByPattern(
  input: string,
  pattern: RegExp,
  tokens: ProtectedToken[],
  replacementFor: (match: string) => string,
  trimSentencePunctuation = false,
): string {
  pattern.lastIndex = 0;
  return input.replace(pattern, (match, ...groups: unknown[]) => {
    let protectedValue =
      typeof groups[0] === "string" && groups[0] ? groups[0] : match;
    let suffix = "";
    if (trimSentencePunctuation) {
      const punctuation = protectedValue.match(/[.,;:!?]+$/)?.[0] ?? "";
      if (punctuation) {
        protectedValue = protectedValue.slice(0, -punctuation.length);
        suffix = punctuation;
      }
    }
    if (!protectedValue) return match;
    const slot = placeholder(tokens.length);
    tokens.push({
      placeholder: slot,
      original: protectedValue,
      replacement: replacementFor(protectedValue),
    });
    return match.replace(`${protectedValue}${suffix}`, `${slot}${suffix}`);
  });
}

export const zhHansProfile: LocaleProfile = {
  locale: "zh-Hans",

  protect(text: string): ProtectedText {
    const tokens: ProtectedToken[] = [];
    let protectedText = text;

    for (const [pattern, target] of GLOSSARY) {
      protectedText = protectByPattern(
        protectedText,
        pattern,
        tokens,
        (match) => (target === "$&" ? match : target),
      );
    }

    for (const { pattern, trimSentencePunctuation } of IMMUTABLE_PATTERNS) {
      protectedText = protectByPattern(
        protectedText,
        pattern,
        tokens,
        (match) => match,
        trimSentencePunctuation,
      );
    }

    return { text: protectedText, tokens };
  },

  restore(text: string, tokens: ProtectedToken[]): string | null {
    let restored = text;
    for (const token of tokens) {
      const occurrences = restored.split(token.placeholder).length - 1;
      if (occurrences !== 1) return null;
      restored = restored.replace(token.placeholder, token.replacement);
    }
    return /⟦[0-9a-z]{3}⟧/i.test(restored) ? null : restored;
  },

  normalize(text: string): string {
    return text
      .normalize("NFC")
      .replace(/,+(?=\s*[\u3400-\u9fff])/g, "，")
      .replace(/(?<=[\u3400-\u9fff]),+/g, "，")
      .replace(/;+(?=\s*[\u3400-\u9fff])/g, "；")
      .replace(/(?<=[\u3400-\u9fff]);+/g, "；")
      .replace(/:+(?=\s*[\u3400-\u9fff])/g, "：")
      .replace(/(?<=[\u3400-\u9fff]):+/g, "：")
      .replace(/(?<=[\u3400-\u9fff])!+/g, "！")
      .replace(/(?<=[\u3400-\u9fff])\?+/g, "？")
      .replace(/([\u3400-\u9fff])([A-Za-z0-9])/g, "$1 $2")
      .replace(/([A-Za-z0-9])([\u3400-\u9fff])/g, "$1 $2")
      .replace(/\s+([，。！？；：、])/g, "$1")
      .replace(/([，。！？；：])\s+(?=[\u3400-\u9fff])/g, "$1")
      .replace(/([，。！？；：、])\1+/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  },

  validate(
    source: string,
    translation: string,
    tokens: ProtectedToken[],
  ): ValidationResult {
    if (!translation.trim()) return { valid: false, reason: "译文为空" };
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(translation)) {
      return { valid: false, reason: "译文包含异常控制字符" };
    }
    if (source.length >= 12 && !/[\u3400-\u9fff]/.test(translation)) {
      return { valid: false, reason: "译文未包含中文" };
    }
    const ratio = translation.length / Math.max(source.length, 1);
    if (ratio < 0.12 || ratio > 6) {
      return { valid: false, reason: "译文长度异常" };
    }
    for (const token of tokens) {
      if (!translation.includes(token.replacement)) {
        return {
          valid: false,
          reason: `受保护内容未完整保留：${token.original}`,
        };
      }
    }
    return { valid: true };
  },
};

export function finalizeTranslation(
  source: string,
  translatedProtectedText: string,
  protectedText: ProtectedText,
): { text: string; validation: ValidationResult } {
  const restored = zhHansProfile.restore(
    translatedProtectedText,
    protectedText.tokens,
  );
  if (restored === null) {
    return {
      text: source,
      validation: { valid: false, reason: "翻译过程改变了受保护内容" },
    };
  }
  const normalized = zhHansProfile.normalize(restored);
  return {
    text: normalized,
    validation: zhHansProfile.validate(
      source,
      normalized,
      protectedText.tokens,
    ),
  };
}
