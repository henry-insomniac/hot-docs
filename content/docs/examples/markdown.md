---
title: Markdown 展示示例
order: 10
---

# Markdown 展示示例

下面内容用于快速确认渲染效果（GFM + heading slug）。

## 表格

| 能力 | 状态 | 备注 |
| --- | --- | --- |
| 表格 | ✅ | GFM |
| 任务列表 | ✅ | GFM |
| 标题锚点 | ✅ | rehype-slug |

## 任务列表

- [x] 扫描内容
- [x] Markdown 渲染
- [x] 主题加载
- [x] 插件 build hooks

## 代码块

```ts
export function hello(name: string): string {
  return `Hello ${name}`;
}
```

## 引用

> 这是一个 blockquote 示例。

