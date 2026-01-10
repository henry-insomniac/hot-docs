---
title: 插件系统（v0.4）
order: 20
---

# 插件系统（v0.4）

当前实现的目标：让插件能参与 Markdown 渲染扩展，并在 build 阶段生成额外产物。

## 配置

```json
{
  "plugins": [
    { "name": "@hot-docs/plugin-sitemap", "options": { "siteUrl": "https://example.com" } },
    { "name": "@hot-docs/plugin-feed", "options": { "siteUrl": "https://example.com" } }
  ]
}
```

同时支持本地插件文件：

```json
{ "plugins": [{ "path": "./plugins/my-plugin.mjs", "options": { "foo": 1 } }] }
```

## 插件声明（package.json#hotDocs）

```json
{
  "hotDocs": { "type": "plugin", "apiVersion": "1", "entry": "./dist/index.js" }
}
```

## 参考插件

- `@hot-docs/plugin-sitemap`：生成 `dist/sitemap.xml`
- `@hot-docs/plugin-feed`：生成 `dist/feed.xml`（默认仅包含 build 未过滤的 blog 文章）

