# Hot Docs 文档系统需求文档 v2.0（PRD + 技术方案草案）

> 目标：做一个开源、可任意环境部署的文档系统，既可作为团队文档站，也可作为个人 Blog/知识库；核心能力是“实时更新的 Markdown 渲染”+“主题与生态插件体系”。

## 0. 版本与范围
- 版本：v2.0（在 v1.0 基础上补齐“开源/通用部署/Blog 形态”）
- 形态：CLI + 本地 dev server + 可构建产物（静态优先，可选 SSR）
- 内容：以本地目录为单一事实来源（Markdown/资源文件），不依赖特定云服务
- 扩展：主题/插件可作为独立包或本地目录加载，适合开源生态建设

## 1. 我的理解（基于你的描述）

你希望这个项目做成一个“面向开发者的通用文档系统”，既能支撑团队知识库，也能支撑个人 Blog；核心诉求是：

1) **实时更新**：监控指定目录（如 `./docs-src`）内的 `.md` 文件变更，页面无需手动刷新即可看到最新渲染结果（接近 HMR/Live Reload 体验）。  
2) **主题可插件化**：主题不仅是换色，而是可以通过“主题插件”交付（布局、样式、组件、token），并能被用户选择/切换/二次定制。  
3) **文档生态插件**：支持固定格式/规范的“功能插件”，用于扩展 Markdown 能力与站点能力（如：自定义语法块、图表、流程图、代码高亮、搜索、目录树、注释系统、版本切换等）。  
4) **默认主题偏开发者暗色阅读**：深灰/黑底，中性色层级，少量霓虹/高饱和强调色，边框微发光，卡片分层清晰，图表对比明显，hover 高亮，适合长时间阅读与工程落地。

在 v2.0 中，需要额外满足：
5) **开源可分发**：对外可 fork/贡献，具备清晰的版本、API 兼容策略与扩展点。  
6) **任意环境部署**：支持静态部署（GitHub Pages/对象存储/CDN）、容器部署（Docker）、传统服务器（Nginx/Node）等。  
7) **Docs + Blog 双形态**：同一套引擎同时支持“文档站信息架构（侧边栏）”与“Blog 信息架构（标签/归档/RSS）”。

本文档将需求拆成：**MVP（可用）** 与 **可扩展（生态）** 两层，并给出一套可落地的架构与插件/主题规范草案，便于后续直接进入实现阶段。

## 2. 目标与非目标

### 2.1 产品目标
- 在开发环境提供**实时预览**：文件保存后 0.2~1s 内反映到浏览器（取决于文档体量/插件链）。
- 在生产环境提供**稳定可部署**：静态优先（可选 SSR），可部署到 GitHub Pages/对象存储/CDN/Nginx/容器平台。
- 提供**可插拔的主题系统**：默认内置一套高质量暗色主题；支持第三方主题插件。
- 提供**可插拔的文档插件系统**：插件可扩展 Markdown 解析/渲染、站点路由、导航、搜索、客户端能力等。
- 提供**开源友好体验**：低门槛上手（`init/dev/build/preview`），清晰的贡献指南与插件开发文档（后续在仓库补齐）。
- 支持**两种内容产品形态**：团队文档（Docs）与个人博客（Blog），并允许混合站点（同一站点同时存在 docs 与 blog）。

### 2.2 非目标（第一阶段不做或可选）
- 多租户/权限系统（可作为后续插件或企业版能力）
- 在线编辑器（可选，非核心）
- 复杂协作工作流（审批、评论流、任务联动等）

## 3. 用户画像与典型场景

### 3.1 用户画像
- **开发者/架构师**：写技术文档、规范、ADR、组件/接口说明，需要快速预览与良好的代码/图表呈现。
- **团队维护者**：希望统一文档风格与站点结构，支持主题/插件以适配团队工程规范。
- **个人博主/创作者**：希望用 Markdown 写作并一键发布，具备标签/归档/RSS/SEO 等基础能力，同时保留高度可定制性。
- **插件/主题作者**：希望有明确的扩展点与稳定的 API/契约。

### 3.2 典型场景
- 本地写文档：`md` 保存后浏览器自动更新（无需手动刷新）。
- 文档站点：自动生成目录树、面包屑、页内 TOC、搜索。
- 文档增强：支持 Mermaid、KaTeX、代码块高亮、提示块（admonition）、标签页、API 片段引用等。
- 主题换肤：一键切换主题包或按 token 覆盖局部颜色/阴影/字体。
- Blog 发布：生成文章列表/标签/归档、RSS、sitemap，并可通过插件接入评论/统计/站点分析。

## 4. 信息架构与内容约定

### 4.0 内容集合（Docs / Blog / Pages）
为同时支持团队文档与个人 Blog，建议引入“内容集合（collection）”概念：同一站点可包含多类内容，并各自生成导航与路由。

推荐默认集合（可配置增删）：
- `docs`：文档页（面向知识库/产品文档/规范），强调侧边栏树与版本化结构
- `blog`：文章（面向时间序内容），强调列表、标签、分类、归档、RSS
- `pages`：独立页（如 About、Projects、Changelog），通常不进入侧边栏树

### 4.1 建议目录结构（默认约定）
推荐默认约定（可配置）：
- `contentDir`: 内容根目录，例如 `./content`
  - `./content/docs/**.md`（文档）
  - `./content/blog/**.md`（文章）
  - `./content/pages/**.md`（独立页）

兼容模式（便于从 v1.0 迁移）：
- 仅配置 `docsDir: "./docs-src"` 时，视为只有 `docs` 集合

### 4.2 文档集合来源与路由规则
默认约定（可配置）：
- `docsDir`: 文档源目录，例如 `./docs-src`
- 递归扫描 `docsDir` 下的 `.md` / `.mdx`（可选）文件
- 生成路由：路径 = 文件相对路径（去扩展名），如：`docs-src/guide/intro.md` -> `/guide/intro`

建议支持以下忽略规则（可配置）：
- 忽略：`node_modules`、`.git`、`dist`、`build`、`**/_drafts/**`、`**/*.tmp.md`
- 支持 `.hotdocsignore`（类 `.gitignore`）或复用 gitignore 规则

### 4.3 Frontmatter（推荐）
建议支持 YAML frontmatter，用于导航/SEO/排序：
```yaml
---
title: 快速开始
description: 5 分钟搭建文档站
order: 10
tags: [guide]
sidebar: auto # or false
toc: true
---
```

### 4.3.1 Blog Frontmatter（推荐补充字段）
Blog 形态建议额外支持：
```yaml
---
title: 一次重构：从 X 到 Y
date: 2025-12-21
updated: 2025-12-21
tags: [architecture, refactor]
category: engineering
draft: false
summary: 这篇文章记录了……
cover: ./cover.png
---
```

约定建议：
- `date` 用于排序与归档（Blog 列表默认按 date 倒序）
- `draft: true` 在 dev 可见，build 默认排除（可配置）

### 4.4 Docs 导航生成规则（MVP）
- 目录树按文件系统结构生成
- 同目录内默认按：`order`（frontmatter）→ 文件名排序
- 每页提供：标题、更新时间（可选从 git/mtime）、页内 TOC（可选）

### 4.5 Blog 信息架构（MVP）
- 列表页：
  - `/blog`：文章列表（分页）
  - `/blog/tags/:tag`：标签聚合
  - `/blog/categories/:category`：分类聚合（可选）
  - `/blog/archive/:yyyy`：按年份归档（可选）
- 文章页：
  - `/blog/:slug` 或 `/blog/:yyyy/:mm/:dd/:slug`（二选一，可配置）
- 元数据产物：
  - `rss.xml`（或 atom.json / feed.json，至少一个）
  - `sitemap.xml`
  - `robots.txt`（可配置）

## 5. 核心功能需求（Functional Requirements）

### 5.1 实时更新（本地开发）
**需求点**
- 监控 `docsDir` 内 `add/change/unlink`，自动更新：
  - 导航树（新增/删除文件）
  - 当前页面内容（变更文件）
  - 搜索索引（如启用）
- 浏览器端表现：
  - 当前打开文档若被修改：自动局部刷新内容（最好保持滚动位置）
  - 当前打开文档若被删除：提示并跳转到最近可用页

**交互/体验指标（建议）**
- 变更到可见：小文档（<200KB）≤ 500ms；中等（<1MB）≤ 1s
- 错误可视化：渲染失败时显示错误面板（包含插件链/行号/文件路径）

### 5.2 实时渲染（Markdown 渲染管线）
**基本能力（MVP）**
- CommonMark/GFM：表格、任务列表、删除线、引用、代码块
- 代码高亮（建议 Shiki 或 Prism），支持行高亮/复制按钮（可插件化）
- 图片与资源引用：相对路径解析（相对 md 文件），并做资源服务/打包
- 内部链接：相对 md 链接自动转换为站内路由

**增强能力（可选/插件）**
- Mermaid/PlantUML
- KaTeX/MathJax
- Admonition（提示块）
- Tabs/Steps/Callout 等自定义组件语法

### 5.3 主题系统（Theme as Plugin）
**需求点**
- 主题以插件包形式交付：包含样式（CSS/Token）+ 布局组件（可选）
- 支持三种定制层级：
  1) 仅切换主题（选择 theme 插件）
  2) 基于主题 token 覆盖（在项目配置中覆盖 CSS 变量）
  3) 深度定制（通过主题提供的 hook/slot 替换局部组件）

**主题应影响的范围**
- 色彩体系与层级（背景/前景/边框/阴影/强调色）
- 组件样式：导航、卡片、代码块、表格、引用、提示块、按钮、输入框
- 图表风格：至少提供统一的调色板与网格/轴线颜色建议

### 5.4 文档插件系统（Ecosystem Plugins）
**需求点**
- 插件必须符合固定规范（manifest + entry），可被加载、启用、禁用、排序
- 插件可扩展的能力（按阶段）：
  - Markdown 解析/渲染：remark/rehype 插件注入
  - 路由与页面增强：注入路由、页面布局 slot、客户端脚本
  - 站点数据：扩展导航、生成索引（如全文搜索）、生成额外资源
  - Dev 实时能力：监听更多文件、影响热更新策略

**插件可观察/可调试**
- 插件链顺序可见（在 dev overlay 中展示）
- 插件执行耗时统计（性能诊断）

## 6. 非功能需求（Non-Functional Requirements）

### 6.1 性能
- 首屏：中等站点（~200 篇文档）本地 dev 首屏 < 2s（冷启动可放宽）
- 导航切换：同站点内页面切换 < 200ms（缓存命中）
- 搜索：本地索引查询 < 100ms（中等规模）

### 6.2 兼容性
- 开发环境：macOS / Windows / Linux
- 浏览器：Chrome/Edge/Safari（最近两个大版本）

### 6.3 可维护性与可扩展性
- 插件 API 版本化：`apiVersion`，不兼容升级需显式声明
- 主题与插件隔离：明确运行时（Node/Browser）能力边界

### 6.4 安全（边界说明）
- 插件本质是可执行代码：默认仅信任本地/私有源；如需远程安装需引入签名/白名单（后续）
- 文档目录读取应限制在 `docsDir` 内（避免任意文件读取）

## 7. 配置与命令（建议）

### 7.1 配置文件（建议）
`hot-docs.config.ts`（或 JSON/YAML，优先 TS 便于类型提示）：
```ts
export default {
  // v2.0 推荐：使用内容集合
  contentDir: "./content",
  collections: {
    docs: { dir: "docs", routeBase: "/" },
    blog: { dir: "blog", routeBase: "/blog" },
    pages: { dir: "pages", routeBase: "/" },
  },
  site: { title: "Hot Docs", base: "/" },
  theme: {
    name: "@hot-docs/theme-neon-dark",
    tokens: {
      accent: "#7C3AED",
      accent2: "#22D3EE",
    },
  },
  plugins: [
    "@hot-docs/plugin-mermaid",
    ["@hot-docs/plugin-search", { mode: "local" }],
    "@hot-docs/plugin-feed",
    "@hot-docs/plugin-sitemap",
  ],
};
```

### 7.2 CLI（建议）
- `hot-docs dev`：启动开发服务器 + watch + ws 实时刷新
- `hot-docs build`：构建静态站点（生成路由/索引/资源）
- `hot-docs preview`：本地预览构建产物
- `hot-docs init`：生成最小站点骨架（配置 + 示例内容 + 默认主题）
- `hot-docs new doc <path>`：创建文档页模板（含 frontmatter）
- `hot-docs new post <slug>`：创建 Blog 文章模板（含 date/tags/draft）

### 7.3 部署与交付（v2.0 重点）
默认优先支持静态部署（“任意环境部署”的最小公分母）：
- 构建输出：`dist/`（纯静态资源：HTML/CSS/JS/图片/索引）
- 典型部署方式：
  - GitHub Pages / GitLab Pages（静态托管）
  - Nginx/Apache（静态目录）
  - 对象存储 + CDN（如 S3/OSS/COS）
  - Docker（镜像内包含静态文件 + nginx 或 node server）

可选增强（后续阶段）：
- SSR/Server 模式：适合需要鉴权/动态数据的团队站点（可作为插件或独立 adapter）

部署相关的关键配置：
- `site.base`：支持子路径部署（如 `/docs/`）
- `site.canonical`（可选）：生成 SEO 规范链接
- `assets.base`（可选）：资源 CDN 前缀

## 8. 技术架构方案（可落地）

> 这里给出一套“实现路径”，方便后续直接进入编码；技术栈可替换，但扩展点与契约尽量稳定。

### 8.1 总体架构
建议拆分为三层：
1) **Core（核心）**：扫描文档、构建路由、渲染管线、插件系统、主题系统、dev 热更新通道  
2) **Runtime（前端运行时）**：站点壳、路由、布局、页面渲染、overlay、主题注入  
3) **Plugins/Themes（生态）**：通过规范接入 core/runtime

### 8.2 Dev 实时更新机制
推荐方案：
- Node 侧使用文件监听（如 `chokidar`）监听 `docsDir`
- 维护一个内存态的 `contentIndex`：
  - 文件树（用于 sidebar）
  - 每个文档的元信息（title/order/mtime/hash）
  - 可选：预编译产物（HTML/AST）缓存
- 通过 WebSocket/SSE 将变更事件推送给浏览器：
  - `doc-changed: { path, hash }`
  - `doc-added/doc-removed`
  - `nav-updated`
- 浏览器收到事件后：
  - 若当前页命中变更：重新拉取 `/__hot_docs__/doc?path=...&hash=...` 并热替换渲染结果
  - 保留滚动：根据 heading anchor/scrollTop 做恢复策略（可后续优化）

### 8.3 Markdown 渲染管线（推荐 unified）
渲染流程建议标准化为：
`source(md) -> remark(AST) -> rehype(AST) -> HTML/React节点 -> runtime渲染`

插件扩展点：
- `remarkPlugins`（语法层）
- `rehypePlugins`（HTML AST 层）
- `codeHighlighter`（代码块）
- `assetResolver`（资源路径与打包）

### 8.4 路由与页面模型
每个页面由三部分组成：
- `PageData`：frontmatter、标题、toc、更新时间、上/下一篇链接、标签等
- `PageContent`：渲染产物（HTML/React节点）
- `PageLayout`：主题提供的布局（sidebar/topbar/content）

## 9. 主题插件规范（草案）

### 9.1 主题插件的交付物
一个主题插件建议包含：
- `theme.css`：设计 token（CSS 变量）与基础组件样式
- `layout`：可选，提供 React/Vue/Svelte 等布局组件（取决于最终框架）
- `assets`：字体、背景纹理、图标等
- `manifest`：主题元信息

### 9.2 Manifest（固定格式建议）
推荐在包的 `package.json` 中声明：
```json
{
  "name": "@hot-docs/theme-neon-dark",
  "version": "0.1.0",
  "hotDocs": {
    "type": "theme",
    "apiVersion": "1",
    "entry": "./dist/index.js",
    "style": "./dist/theme.css"
  }
}
```

### 9.3 主题 Token 设计（默认主题基线）
默认暗色主题应至少覆盖以下 token（示例命名）：
- 背景层级：`--hd-bg-0/1/2/3`（页面底色/卡片/浮层/hover）
- 文字层级：`--hd-fg-0/1/2`（主文本/次级/弱化）
- 边框与分割：`--hd-border-0/1`，并支持轻微发光 `--hd-glow`
- 强调色：`--hd-accent`（主强调）、`--hd-accent-2`（辅强调）
- 状态色：`--hd-success/warn/error/info`
- 代码块：`--hd-code-bg`、`--hd-code-fg`、`--hd-code-border`
- 图表：`--hd-chart-grid`、`--hd-chart-axis`、`--hd-chart-series-*`

默认主题视觉要求（从你的描述落到可验收点）：
- 深灰/黑底 + 中性色层级清晰（背景层级差值可感知但不过度）
- 少量高饱和点缀（按钮/链接/选中态/高亮）
- 边框微发光：仅用于 focus/active/选中态，避免全局霓虹导致疲劳
- 卡片分层：阴影与边框同时工作，hover 有明确提升（但不闪烁）
- 图表对比明显：轴线/网格弱化，数据线/柱高对比，暗背景可读

### 9.4 主题组件契约（建议）
为让主题真正“可作为插件交付”，建议在 runtime 内定义一组稳定的可替换组件契约（主题插件可选择性实现）：
- `Layout`：站点整体布局（sidebar + content + toc）
- `DocPage`：文档页渲染外壳（标题区、元信息、正文容器、页脚导航）
- `Sidebar`：目录树（折叠、搜索框、当前页高亮）
- `Navbar`：顶部栏（站点标题、版本/主题切换、外链）
- `TOC`：页内目录（滚动跟随高亮）
- `NotFound`：404
- `HomePage`：站点首页（可选：混合展示 docs 与 blog）
- `BlogIndex`：Blog 列表页（分页/筛选）
- `BlogPost`：文章页（作者/日期/标签/上一篇下一篇）
- `TaxonomyPage`：标签/分类/归档聚合页

主题定制优先级建议（从低到高）：
1) 默认主题（内置）
2) theme 插件提供的 `theme.css` + 组件
3) 项目级 token 覆盖（用户在 config 中覆盖变量/自定义 CSS）
4) 项目级组件覆盖（如允许用户在 `./.hot-docs/overrides` 覆盖某些 slot）

### 9.5 默认主题（Neon Dark）设计细则（建议）
这部分用于把“审美描述”转成可落地的视觉规范，方便实现与验收。

**颜色与层级（建议值域，不强绑定具体色值）**
- 背景：`bg-0` 近黑、`bg-1` 深灰、`bg-2` 卡片灰、`bg-3` hover/选中更亮一档
- 前景：正文 `fg-0` 接近白但不纯白；次级 `fg-1` 灰；弱化 `fg-2` 更灰
- 强调：主强调建议偏紫/青一类高辨识色；辅强调用于图表/链接 hover

**边框微发光（Glows）**
- 仅用于：可交互组件 focus、当前页选中项、卡片 hover（轻量）
- 用法建议：发光半径小、透明度低，与边框/阴影叠加但不抢内容

**卡片与分层**
- 侧边栏、正文、toc 三列分层清晰：卡片/容器之间有明确间距与细边框
- hover 高亮：列表项 hover 背景提升一档 + 左侧强调条或边框色变化

**图表与对比**
- 网格线、坐标轴：使用更弱的中性色（避免喧宾夺主）
- 数据系列：提供高对比色板（至少 8 色），并兼顾色盲友好（后续可插件化）

## 10. 文档插件规范（草案）

### 10.1 插件类型（建议）
- `content`：扩展 Markdown/MDX 内容能力（语法、渲染、资源）
- `site`：扩展站点能力（导航、搜索、路由、页面注入）
- `dev`：扩展开发期能力（watch 额外目录、overlay、诊断）
- `deploy`：扩展部署/构建产物（如输出额外格式、适配特定平台、注入 headers/redirects 配置）

### 10.2 Manifest（固定格式建议）
同样建议放在 `package.json`：
```json
{
  "name": "@hot-docs/plugin-mermaid",
  "version": "0.1.0",
  "hotDocs": {
    "type": "plugin",
    "apiVersion": "1",
    "entry": "./dist/index.js",
    "capabilities": ["remark", "rehype", "client"]
  }
}
```

### 10.3 插件 API（最小可用草案）
插件入口导出一个工厂函数：
```ts
export default function plugin(options) {
  return {
    name: "@hot-docs/plugin-mermaid",
    remarkPlugins: [],
    rehypePlugins: [],
    client: {
      enhanceApp() {},
      components: [],
    },
    onFilesChanged() {},
  };
}
```

约束建议：
- Node 侧 hook 不应依赖浏览器 API
- Browser 侧 hook 不应访问文件系统
- 插件按顺序执行，且应可配置优先级（或显式数组顺序）

### 10.4 插件生命周期与 Hook（建议）
为覆盖“内容解析 → 站点数据 → 路由 → 客户端增强 → dev 热更新”，建议把 Hook 分成 Node 侧与 Browser 侧两部分。

**Node 侧（build/dev 共用）**
- `config(config)`：读取/修改最终配置（如补充忽略规则、注入默认值）
- `extendMarkdown(ctx)`：注入 `remark/rehype`、代码高亮器、资源解析器等
- `extendIndex(index)`：扩展内容索引（如为每页生成摘要、reading time、关键词）
- `transformPage(page)`：对单页产物做二次加工（如注入图表脚本、标题规范化）
- `extendRoutes(routes)`：新增或修改路由（如 `/changelog`、`/tags/:tag`）
- `watchFiles()`：声明额外 watch 路径（如 `./snippets`、`./api`）

**Dev 侧**
- `onDevEvent(event)`：接收文件变化事件（插件可决定触发索引增量更新策略）
- `devOverlay()`：可选，向 overlay 注入诊断信息（性能、错误提示）

**Browser 侧**
- `clientModules`：注入客户端模块（如全局样式、脚本）
- `components`：注册组件（若支持 MDX/组件语法）
- `onRouteChange()`：路由变化时执行（如埋点、页面动画）

### 10.5 插件能力声明（capabilities）建议
为减少“插件做了什么”的不透明性，建议 `capabilities` 作为必填：
- `remark` / `rehype`：影响渲染 AST
- `index`：影响内容索引/搜索
- `routes`：影响路由
- `client`：注入浏览器运行时能力
- `dev`：参与热更新/watch/overlay

### 10.6 插件分发形式（包 / 本地目录）
考虑到项目可能希望“零 npm 依赖也能写插件”，建议同时支持：

1) **包插件**：`@scope/hot-docs-plugin-*`（通过包管理器安装）
2) **本地插件**：放在仓库内固定目录，例如 `./.hot-docs/plugins/<name>/`，包含：
   - `plugin.json`（manifest）
   - `index.ts`（entry）

`plugin.json` 示例：
```json
{
  "name": "local-plugin-search",
  "type": "plugin",
  "apiVersion": "1",
  "entry": "./index.ts",
  "capabilities": ["index", "routes", "client"]
}
```

### 10.7 插件顺序与冲突处理（建议）
- 执行顺序：以配置数组顺序为准（从前到后），并允许插件声明 `enforce: "pre" | "post"`（可选）
- 冲突策略：
  - 渲染链：多个插件修改同一节点时，以后执行者覆盖（并在 dev overlay 提示）
  - 路由：同路径冲突视为错误（必须显式配置解决）
  - CSS：主题优先，插件 CSS 次之，用户覆盖最高

### 10.8 错误与性能诊断（建议）
- 任何插件抛错：dev 下展示 overlay（包含插件名、栈、触发文件、耗时）
- build 下：默认 fail fast；可配置 `--continue-on-error` 输出部分站点用于预览排查
- 性能：统计每个插件在“索引/渲染/构建”阶段耗时，输出 top N

## 11. MVP 里程碑（建议）

### M0：可预览骨架（1）
- 扫描 `docsDir`，生成导航与路由
- Markdown 基础渲染（GFM + 代码高亮）
- Dev server + 文件监听 + 自动刷新

### M1：主题系统（2）
- 默认暗色主题落地（满足你的视觉要求）
- 支持 `theme` 插件加载与 token 覆盖

### M2：插件系统（3）
- 插件 manifest + 加载/禁用/排序
- 至少 1~2 个示例插件（如 Mermaid、Search）

### M3：Blog 形态（v2.0 新增）（4）
- Blog 路由与列表页（分页）
- 标签/分类/归档页面生成
- RSS/Feed 与 sitemap 生成
- 文章草稿与构建过滤（`draft`）

## 12. 验收标准（可直接用于验收）
- 修改任意 `.md`：浏览器当前页在 1s 内自动更新，且无整页闪白（最好局部更新）
- 新增/删除 `.md`：侧边栏在 1s 内反映变化
- 默认主题：暗色层级清晰、hover/focus 明确、代码块可读、长文阅读不刺眼
- 主题可替换：通过配置切换主题插件，站点样式/布局随之变化
- 插件可扩展：安装插件后可为 Markdown 增加新能力（至少演示一种）
- Blog 可用：`/blog` 列表、文章页、tag 聚合页可访问，且构建后静态可部署
- 静态部署可用：在任意静态服务器（例如 Nginx）下可访问，`site.base` 子路径部署正确
- SEO 基础产物：至少生成 `sitemap.xml` 与一个 feed（如 `rss.xml`）
- 草稿策略：`draft: true` 的文章 dev 可见，build 默认不可访问（可配置切换）

## 13. 风险与开放问题（建议后续确认）
- 最终前端框架选择（React/Vue/Svelte）会影响主题/插件的组件形态，但不影响核心契约（manifest、hook、token）
- MDX 支持与否：若需要“在文档里写组件”，建议引入 MDX（复杂度↑，能力↑）
- 大规模文档（>2000 篇）时的索引/搜索与渲染性能策略（需要增量索引与缓存）
- 插件安全：是否允许远程安装、是否需要签名/白名单策略

## 14. 开源化要求（v2.0 新增）
> 这部分是“做成开源项目”时必须提前设计的约束，避免后期生态不可控或破坏兼容性。

### 14.1 许可与治理（建议）
- 许可证：优先 MIT 或 Apache-2.0（二选一，后续由你决定）
- 版本策略：遵循 SemVer；插件 API 用 `apiVersion` 明确兼容性边界
- 贡献流程：提供 `CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、issue/PR 模板（后续落地）

### 14.2 插件与主题生态（建议）
- 生态目标：支持“本地插件（零发布）”与“包插件（npm/registry）”两条路径
- 兼容策略：
  - core/runtime 升级不应频繁破坏主题与插件
  - 如需破坏性变更：通过 `apiVersion` 与迁移指南承接

### 14.3 易用性（建议验收维度）
- “一条命令启动”体验：`hot-docs init && hot-docs dev`
- 默认配置即可产出一个可部署站点（包含 docs + blog 示例）
- 新用户不理解插件体系也能用；高级用户可渐进增强
