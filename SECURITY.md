# Security Policy

[简体中文](SECURITY.zh-CN.md)

## Supported versions

Only the latest stable release is supported. Please confirm that the issue is reproducible with the newest GitHub Release.

## Reporting a vulnerability

Use GitHub's [private vulnerability reporting](https://github.com/agilawiegel-ux/repolingo-extension/security/advisories/new) instead of opening a public Issue. Include:

- the affected RepoLingo and browser versions;
- reproducible steps or a minimal proof of concept;
- the expected impact, especially for API-key exposure, permission bypasses, HTML or script injection, or cross-page data disclosure;
- your proposed disclosure timeline.

The maintainer will acknowledge the report as soon as practical and coordinate disclosure after a fix and release are ready. Do not test against systems you do not own or have permission to assess.

## Security boundaries

RepoLingo treats both webpage content and model output as untrusted data. Model output is never executed as HTML. API keys are available only to trusted extension pages and the background service worker. Security reports should focus on behavior that can cross these boundaries.
