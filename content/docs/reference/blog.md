---
title: Blog Frontmatter
---

# Blog Frontmatter

Hot Docs 的 Blog 列表页与 taxonomy 页面会读取文章的 frontmatter 来展示摘要与封面图。

## 常用字段

- `title`: 标题（缺省时会从正文第一个 `#` 或文件名推导）
- `date`: 日期（用于排序与列表展示）
- `updated`: 更新时间（存在时优先用于排序与列表展示）
- `tags`: 标签数组（用于生成 `/blog/tags/` 及 tag 详情页）
- `category`: 分类（用于生成 `/blog/categories/` 及分类详情页）
- `draft`: 草稿（dev 可见；build 默认排除）

## 摘要（列表展示）

- `summary`: 列表摘要（优先使用）
- `description`: 列表摘要（当 `summary` 为空时作为 fallback）

## 封面图（列表展示）

- `cover`: 封面图片地址
  - 支持 `http(s)://...` 或 `data:image/...`
  - 支持以 `/` 开头的站内绝对路径（会按 `site.base` 自动 rebase）
  - 支持相对路径（以当前文章 `.md` 所在目录为基准，且必须位于 blog collection 目录内）
- `coverAlt`: 图片 alt（缺省时回退到 `title`）

安全说明：`cover` 会忽略 `javascript:` / `vbscript:` 等不安全 scheme。
