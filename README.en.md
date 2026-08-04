# RepoLingo

> Make GitHub easier to understand while keeping the English source one click away.

[![CI](https://github.com/agilawiegel-ux/repolingo-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/agilawiegel-ux/repolingo-extension/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/agilawiegel-ux/repolingo-extension?display_name=tag)](https://github.com/agilawiegel-ux/repolingo-extension/releases)
[![License](https://img.shields.io/github/license/agilawiegel-ux/repolingo-extension)](LICENSE)

RepoLingo is a lightweight, Chinese-first Chromium extension. It uses the browser's built-in Translator API by default to translate GitHub's English natural-language content into Simplified Chinese on-device. No account, API key, bundled model, remote font, telemetry, or runtime UI framework is required.

OpenAI, Gemini, and DeepSeek are available only as explicit, optional enhancements. RepoLingo never enables them automatically or silently falls back from local translation to a paid service.

[简体中文](README.md) · [Website](https://agilawiegel-ux.github.io/repolingo-extension/) · [Download](https://github.com/agilawiegel-ux/repolingo-extension/releases/latest) · [Privacy](PRIVACY.md) · [Security](SECURITY.md)

![RepoLingo local translation, source, and bilingual controls on GitHub](docs/assets/repolingo-preview.png)

## Project status

v0.1.0 is the first public preview. It targets desktop Chrome 138+ and compatible Edge releases, with official support for English to Simplified Chinese.

- Local translation is the complete default experience; provider APIs are optional.
- Current build size is about 28 KB zipped and 62 KB unpacked.
- Firefox, mobile browsers, persistent translation caches, and additional target languages are not supported yet.

See the [roadmap and known limitations](ROADMAP.md) before filing a feature request.

## Highlights

- Local-first translation with no required account or API key.
- Original, translated, and bilingual modes without reloading the page.
- Protection for code, commands, URLs, paths, versions, SHAs, flags, and identifiers.
- README, repository description, Issue, Pull Request, Discussion, and Release coverage.
- Suspicious or invalid translations fall back to the source text.
- Vanilla TypeScript, HTML, and CSS with no telemetry or runtime UI dependencies.

## Install

RepoLingo is not in the Chrome Web Store or Edge Add-ons yet. Install the GitHub Release build:

1. Open the [latest Release](https://github.com/agilawiegel-ux/repolingo-extension/releases/latest).
2. Download and extract `repolingo-chromium-vX.Y.Z.zip`.
3. Open `chrome://extensions` or `edge://extensions`.
4. Enable Developer mode.
5. Select **Load unpacked** and choose the extracted directory.
6. Open a GitHub repository and select the `中文 ⇄ EN` control.

The browser may download a shared language pack the first time translation is requested. Local translation can continue offline after the pack is ready.

## Use

- Select **中文** to translate or display Chinese.
- Select **EN** to restore the original without reloading.
- Open `···` to enable bilingual mode, remember the repository preference, or open settings.
- Hover a translated block and use `EN/中` to verify only that block.
- Use the toolbar popup to switch the entire page between Chinese, bilingual, and original modes.

All controls are keyboard accessible. Press `Esc` to close the expanded GitHub panel.

## Optional enhanced translation

Provider translation remains off until the user explicitly enables it, chooses a provider, enters their own API key, and grants the matching optional host permission. Only protected natural-language segments are sent.

RepoLingo does not proxy requests, pay provider fees, or automatically choose a paid API. Provider terms, pricing, limits, and data handling apply independently.

## Supported content

| Content | v0.1.0 |
| --- | --- |
| README and repository description | Supported |
| Issue, Pull Request, and Discussion prose | Supported |
| Release title and notes | Supported |
| Code, commands, links, paths, and identifiers | Preserved |
| Diffs, file trees, logs, forms, and GitHub controls | Excluded |

## Build from source

Node.js 20 or newer is required; Node.js 22 is recommended.

```bash
git clone https://github.com/agilawiegel-ux/repolingo-extension.git
cd repolingo-extension
npm ci
npm run verify
```

Load `dist/` as an unpacked extension. Release archives and checksums are written to `release/`.

## Quality, privacy, and security

The release gate includes 120 reviewed reference cases across five GitHub page types, placeholder validation, deterministic Chinese normalization, DOM fixtures, provider response parsing, Manifest checks, secret scanning rules, and hard package-size limits.

Machine translation cannot guarantee zero semantic errors. RepoLingo instead guarantees verifiability: protected technical content must survive validation, suspicious translations are not forced onto the page, and the English source remains available.

Read [Privacy](PRIVACY.md), [Security](SECURITY.md), [Support](SUPPORT.md), and [Contributing](CONTRIBUTING.md) for details.

## License

RepoLingo is released under the [MIT License](LICENSE).
