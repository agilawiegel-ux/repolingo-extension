# Contributing to RepoLingo

[简体中文](CONTRIBUTING.zh-CN.md)

Thank you for helping make RepoLingo more accurate, lightweight, and approachable.

## Before you start

1. Search existing Issues to avoid duplicate work.
2. For feature changes, describe the use case and the expected impact on package size, privacy, permissions, and translation quality.
3. For terminology changes, include a real GitHub context. Context-free word lists are not accepted.

## Local development

```bash
npm install
npm run verify
```

`npm run verify` runs type checks, unit and DOM tests, build-security checks, packaging, and size budgets. It must pass before a Pull Request is submitted.

## Design principles

- Local translation remains the zero-configuration default.
- Enhanced translation must be explicitly enabled and must explain what is sent and who may charge for it.
- The original DOM, code, commands, paths, links, anchors, and GitHub behavior must remain intact.
- Do not add a runtime UI framework, remote font, telemetry, or unnecessary permission.
- New UI must support light and dark themes, keyboard use, and reduced-motion settings.

## Translation-quality changes

When changing protection rules or terminology, add or update reference cases in `quality/corpus.json` and include a test that fails before the fix and passes afterward. Simplified Chinese should follow common Mainland Chinese developer usage. When a term remains reasonably ambiguous, prefer preserving the English term or showing both languages.

## Pull Requests

Keep changes focused. Explain the problem, solution, verification, package-size impact, and privacy impact. Include light- and dark-theme screenshots for UI changes. By submitting a contribution, you agree to license it under the MIT License.
