---
title: 主题与 Token
order: 10
---

# 主题与 Token

Hot Docs 支持从主题包加载 CSS，并允许用 tokens 覆盖 CSS 变量。

## 主题包（Theme as Plugin）

主题包在 `package.json#hotDocs` 中声明：

```json
{
  "hotDocs": { "type": "theme", "apiVersion": "1", "style": "./theme.css" }
}
```

配置启用：

```json
{ "theme": { "name": "@hot-docs/theme-neon-dark" } }
```

## Tokens 覆盖

```json
{ "theme": { "tokens": { "accent": "#7c3aed", "bg-0": "#0b1020" } } }
```

tokens 会生成 `:root{--hd-...}` 的 CSS 变量，例如 `accent` → `--hd-accent`。

