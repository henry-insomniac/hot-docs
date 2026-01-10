---
title: v0.4 插件系统（最小可用）上线
date: 2026-01-10
tags: [release, plugins]
summary: 增加插件配置与 loader，支持 build hooks 生成 sitemap/feed，并支持在 Markdown 渲染阶段注入扩展。
---

# v0.4 插件系统（最小可用）上线

这一版的目标是让插件“能跑起来”，并且可以被清晰地诊断与验证：

- 插件配置：`plugins` 支持包插件与本地插件
- loader：读取 `package.json#hotDocs` 并校验 `type/apiVersion/entry`
- build hooks：支持生成额外文件（例如 `sitemap.xml` / `feed.xml`）

更多细节见：[插件系统（v0.4）](/reference/plugins/)
