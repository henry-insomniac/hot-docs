---
name: theme
description: "辅助开发 Hot Docs 主题，包括默认 Neon Dark 主题完善和第三方主题开发（Hot Docs 特有）"
category: development
priority: required
required_before: [branch, arch]
required_after: [test, docs, commit]
auto_trigger: false
hot_docs_specific: true
branch_required: true
tags: [development, theme, hot-docs, ui, styling]
---

# /theme - 主题开发专家

## 描述
辅助开发 Hot Docs 主题，包括默认 Neon Dark 主题完善和第三方主题开发。这是 Hot Docs 特有的 Skill。

## 适用场景
- 默认 Neon Dark 主题完善
- 第三方主题开发
- 主题 token 设计与覆盖
- 主题组件实现

## Neon Dark 主题要求

### 背景层级
```css
--hd-bg-0: #0a0a0a;    /* 页面底色 */
--hd-bg-1: #1a1a1a;    /* 卡片 */
--hd-bg-2: #2a2a2a;    /* 浮层 */
--hd-bg-3: #3a3a3a;    /* hover */
```

### 前景层级
```css
--hd-fg-0: #e8e8e8;    /* 主文本 */
--hd-fg-1: #b8b8b8;    /* 次级文本 */
--hd-fg-2: #888888;    /* 弱化文本 */
```

### 强调色（霓虹点缀）
```css
--hd-accent: #7C3AED;   /* 紫色 */
--hd-accent-2: #22D3EE; /* 青色 */
```

### 微发光（仅 focus/active）
```css
--hd-glow: 0 0 8px rgba(124, 58, 237, 0.3);
```

## 工作流程
1. 设计主题 token 体系（CSS 变量）
2. 编写 theme.css（层级/强调/状态色）
3. 实现主题组件契约（Layout/Sidebar/DocPage/BlogPost）
4. 处理暗色模式细节（卡片层级/微发光边框）
5. 验证图表配色对比度
6. 编写主题文档与配置示例

## 主题组件契约

### Docs 组件
- `Layout` - 站点整体布局
- `Sidebar` - 侧边栏目录树
- `DocPage` - 文档页面
- `TOC` - 页内目录
- `Navbar` - 顶部导航

### Blog 组件
- `BlogIndex` - 文章列表页
- `BlogPost` - 文章详情页
- `TaxonomyPage` - 标签/分类页

### 通用组件
- `HomePage` - 首页
- `NotFound` - 404 页面

## 输入示例
```
/theme 完善 Neon Dark 主题的代码块样式
/theme 设计一个轻量白色主题
/theme 实现主题切换功能
```

## 主题开发最佳实践

### ✅ 好的主题特征
- Token 优先（CSS 变量为主）
- 层级清晰（背景/前景/强调色明确）
- 可访问性（对比度 > 4.5:1）
- 暗色友好（长时间阅读不疲劳）

### ❌ 避免的陷阱
- 过度使用发光效果（霓虹疲劳）
- 硬编码颜色（应使用 token）
- 忽略色盲友好（图表配色）
- 缺少 hover 状态（交互不明确）

## 相关文件
- packages/theme-*/（主题实现）
- docs/theme-development.md（主题开发文档）

## 配合使用的 Skills
- `/implement` - 实现主题组件
- `/docs` - 编写主题文档
