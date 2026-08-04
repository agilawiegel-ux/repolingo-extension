# 更新日志

[English](CHANGELOG.md)

RepoLingo 的重要变更记录在此文件中。版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

暂无。

## [0.1.0] - 2026-08-04

### 新增

- 浏览器内置 Translator API 驱动的本地英文到简体中文翻译。
- README、仓库简介、Issue、Pull Request、Discussion 与 Release 覆盖。
- 原文、译文、双语和单段 `EN/中` 核验。
- OpenAI、Gemini、DeepSeek 可选增强接口，默认全部关闭。
- 技术实体保护、占位符校验、中文规范化与异常回退。
- 120 条五类页面参考语料及自动质量门禁。
- 中英文文档、隐私说明、安全政策、贡献指南和支持说明。
- GitHub Pages 官网、CI、依赖更新与自动 Release 流程。

### 安全

- 原始 DOM 始终保留，译文仅通过受控文本节点写入。
- 内容脚本无法读取 API Key；可选服务域名按需授权。
- 构建检查阻止远程脚本、危险执行和敏感信息进入产物。

[Unreleased]: https://github.com/agilawiegel-ux/repolingo-extension/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/agilawiegel-ux/repolingo-extension/releases/tag/v0.1.0
