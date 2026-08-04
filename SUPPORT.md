# RepoLingo Support

[简体中文](SUPPORT.zh-CN.md)

## Before opening an Issue

1. Update to a supported browser version.
2. Confirm that the problem occurs on `https://github.com/`.
3. Refresh the page and reopen the RepoLingo panel.
4. Install the latest GitHub Release.
5. Remove API keys, private-repository content, and personal information from screenshots and logs.

## Frequently asked questions

### Is an API key required?

No. Local translation is the complete default experience. Enhanced translation is only for users who explicitly want a provider to handle more complex technical language.

### Why is local translation unavailable?

The browser may not expose the Translator API yet, may be outdated, or may be temporarily unable to download the language pack. Update Chrome or Edge and try again. RepoLingo never falls back to a paid service automatically.

### Why was a block not translated?

It may be code, a Diff, a log, the file tree, a form, or a GitHub control. It may also have failed placeholder or quality validation. Preserving the original is the expected safe behavior in these cases.

### Are translations saved?

Translations remain in memory for the current page and are not kept as long-term history after a refresh or close. Display preferences and settings explicitly configured by the user remain in extension local storage.

### Who pays for enhanced translation?

RepoLingo does not charge users or proxy provider requests. A third-party API configured by the user may charge under that provider's own terms.

## Where to ask

- Reproducible bugs and translation errors: use the Bug Report template.
- Feature proposals: use the Feature Request template.
- Security vulnerabilities: use GitHub private vulnerability reporting; never disclose them publicly first.
- Code or corpus contributions: read `CONTRIBUTING.md` and open a Pull Request.

Reports with clear reproduction steps, versions, and context—and without sensitive information—are the easiest to investigate.
