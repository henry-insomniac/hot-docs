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

## `dev`

示例：

```json
{
  "dev": {
    "host": "127.0.0.1",
    "port": 5173,
    "includeDrafts": true,
    "strictPort": false
  }
}
```

- `port` 默认 `5173`；若端口被占用且 `strictPort=false`（默认），会自动尝试下一个可用端口
- `strictPort=true` 时端口占用会直接报错（便于 CI 或固定端口场景）
- CLI 也支持临时覆盖：`hot-docs dev --port 5175 --host 127.0.0.1`
