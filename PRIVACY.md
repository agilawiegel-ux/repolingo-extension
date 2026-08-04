# RepoLingo Privacy Notice

[简体中文](PRIVACY.zh-CN.md)

Effective: August 4, 2026

RepoLingo uses the browser's built-in local translation by default. The project does not operate a cloud service, create user accounts, collect telemetry or analytics, use advertising identifiers, or retain a long-term translation history.

## Local mode

- GitHub page text is not sent to the RepoLingo maintainer or a third-party translation API.
- Chrome or Edge may download and manage its own language pack through the built-in Translator API.
- Translations remain in memory for the current page and are not saved as browsing history after a refresh or close.
- The extension stores only display preferences, per-repository preferences, and settings that the user explicitly configures.

## Optional enhanced mode

RepoLingo contacts OpenAI, Gemini, or DeepSeek only after the user enables enhanced translation, enters an API key, and grants the matching optional host permission. Requests contain protected natural-language segments. Code, commands, URLs, paths, versions, commit SHAs, flags, identifiers, and protected terms are replaced with placeholders before transmission.

API keys are stored in trusted browser-extension local storage. GitHub pages and RepoLingo content scripts cannot read that storage directly. Each provider processes requests under its own terms and privacy policy.

## Permissions

- `storage`: saves display preferences and optional enhanced-translation settings.
- `https://github.com/*`: identifies and renders translatable natural-language content on GitHub.
- Optional provider hosts: requested only when the user enables that provider, and used only to send translation requests directly.

RepoLingo does not sell or share personal data. Material privacy changes will be documented in both the release notes and this notice.
