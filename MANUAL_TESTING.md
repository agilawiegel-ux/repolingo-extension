# Manual Release Checklist

[简体中文](MANUAL_TESTING.zh-CN.md)

Automated tests cannot replace checks against the browser's Translator API, real GitHub pages, and optional providers. Complete this checklist before every stable release.

## Chrome 138+

- [ ] Load `dist/` with no Manifest errors.
- [ ] Show language-pack download progress on the first translation request.
- [ ] After the pack is ready, disconnect from the network and translate a README locally.
- [ ] Switch between original, translated, and bilingual modes without changing the scroll position.
- [ ] Keep heading anchors, links, disclosure widgets, tables, and inline code usable.
- [ ] Translate only newly added comments on Issues, Pull Requests, and Discussions.
- [ ] Exclude Pull Request Diffs, file trees, logs, inputs, and GitHub controls.

## Edge

- [ ] Repeat the language-pack, offline, page-type, and dynamic-navigation checks from Chrome.

## Optional providers

- [ ] OpenAI: grant permission explicitly, test the connection, and translate a real batch.
- [ ] Gemini: grant permission explicitly, test the connection, and translate a real batch.
- [ ] DeepSeek: grant permission explicitly, test the connection, and translate a real batch.
- [ ] Disable enhanced translation and confirm that local mode resumes without paid requests.
- [ ] Confirm that invalid keys, denied permissions, rate limits, and invalid JSON produce recoverable errors and preserve source text.

## UI and accessibility

- [ ] Confirm clear contrast and hierarchy in GitHub light and dark themes.
- [ ] Open the panel, switch modes, save settings, and close the panel using only the keyboard.
- [ ] Confirm that animations stop when the system requests reduced motion.
- [ ] Check for clipping at 125% and 200% browser zoom.
- [ ] Perform basic Windows high-contrast and screen-reader checks.

## Security and release

- [ ] Ensure API keys do not appear in content scripts, the console, build artifacts, search output, or Issue screenshots.
- [ ] Verify the GitHub Release ZIP against its `.sha256` file.
- [ ] Confirm ZIP size is at most 250 KB and unpacked size is at most 500 KB.
