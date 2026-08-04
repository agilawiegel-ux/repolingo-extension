# Changelog

[简体中文](CHANGELOG.zh-CN.md)

All notable changes to RepoLingo are documented here. Versions follow [Semantic Versioning](https://semver.org/), and this file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

No unreleased changes.

## [0.1.0] - 2026-08-04

### Added

- On-device English-to-Simplified-Chinese translation through the browser's built-in Translator API.
- Coverage for READMEs, repository descriptions, Issues, Pull Requests, Discussions, and Releases.
- Original, translated, bilingual, and per-block `EN/中` verification controls.
- Optional OpenAI, Gemini, and DeepSeek providers, all disabled by default.
- Technical-entity protection, placeholder validation, Chinese normalization, and safe fallback behavior.
- 120 reference cases across five GitHub page types and an automated release quality gate.
- English and Simplified Chinese project documentation, privacy and security policies, contribution guidance, and support notes.
- GitHub Pages, CI, dependency updates, and automated GitHub Releases.

### Security

- The original DOM is preserved and translations are written only through controlled text nodes.
- Content scripts cannot read API keys; optional provider host permissions are requested only when needed.
- Build checks prevent remote scripts, dangerous execution, and sensitive data from entering release artifacts.

[Unreleased]: https://github.com/agilawiegel-ux/repolingo-extension/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/agilawiegel-ux/repolingo-extension/releases/tag/v0.1.0
