---
title: 配置说明
order: 20
---

# 配置说明

默认读取项目根目录的 `hot-docs.config.json`（也支持 `hot-docs.config.(js|mjs|cjs)`）。

最小示例：

```json
{
  "contentDir": "./content",
  "collections": {
    "docs": { "dir": "docs", "routeBase": "/", "type": "docs" },
    "blog": { "dir": "blog", "routeBase": "/blog", "type": "blog" },
    "pages": { "dir": "pages", "routeBase": "/", "type": "pages" }
  },
  "site": { "title": "Hot Docs", "base": "/" }
}
```

## `site.base`

用于子路径部署（例如部署在 `https://example.com/docs/`）：

```json
{ "site": { "base": "/docs/" } }
```

- dev/build/preview 都会遵守该 base
- Markdown 中的站内链接/图片/相对资源会被统一重写到带 base 的 URL

## `theme`

启用主题包 + 覆盖 token：

```json
{
  "theme": {
    "name": "@hot-docs/theme-neon-dark",
    "tokens": { "accent": "#7c3aed" }
  }
}
```

更多说明见：[主题与 Token](../reference/theme.md)

## `plugins`（v0.4）

示例（build 阶段生成 `sitemap.xml` 与 `feed.xml`）：

```json
{
  "plugins": [
    { "name": "@hot-docs/plugin-sitemap", "options": { "siteUrl": "https://example.com" } },
    { "name": "@hot-docs/plugin-feed", "options": { "siteUrl": "https://example.com" } }
  ]
}
```

更多说明见：[插件系统（v0.4）](../reference/plugins.md)

