# Hot Docs 技术栈说明 v2.0（轻量静态优先）

> 目标：在满足“开源、任意环境部署、Docs + Blog 双形态、主题/插件生态”的前提下，默认技术选型以**轻量、可维护、可扩展**为第一优先级；MDX/重前端运行时不作为默认必选。

## 1. 选型结论（默认主栈）

### 1.1 语言与工程组织
- **TypeScript + Node.js LTS（20/22）**
  - 理由：生态成熟、跨平台、构建/解析工具链丰富，适合做“内容引擎 + 插件体系 + CLI”。
- **pnpm（建议 monorepo）**
  - 理由：适合将 `core/dev-server/runtime/cli/themes/plugins` 分包发布，方便开源生态与版本治理。

### 1.2 内容与渲染（构建期为主）
- **Markdown/HTML 管线：unified（remark/rehype）**
  - 理由：插件化最成熟；与“文档生态插件”需求高度匹配。
- **Frontmatter：gray-matter**
  - 理由：广泛使用，足够稳定。
- **默认输出：预渲染 HTML（静态优先）**
  - 理由：部署最简单（`dist/` 纯静态）；运行时依赖最少；适合任意环境与长期维护。

### 1.3 代码高亮与暗色阅读体验
- **Shiki**
  - 理由：暗色主题下呈现稳定；可与主题 token 协作控制背景/边框/行高亮等。

### 1.4 Dev 实时更新
- **文件监听：chokidar**
  - 理由：跨平台表现成熟，能覆盖新增/修改/删除与目录变更。
- **推送通道：WebSocket（ws）或 SSE**
  - 默认建议 WS：更通用，可扩展为 nav/search 增量事件。

### 1.5 打包与客户端增强（最小化）
- **esbuild**
  - 理由：足够轻；用于打包“搜索/复制代码/图表渲染”等少量客户端脚本即可，不引入大型 runtime。

### 1.6 搜索与站点产物（插件化）
- **搜索（可选插件）**：构建期生成索引 JSON + 浏览器端 `minisearch`（或 `flexsearch`）
- **RSS/Feed（插件）**：`feed`（生成 RSS/Atom/JSON Feed）
- **Sitemap（插件）**：构建期生成 `sitemap.xml`

## 2. 为什么不默认选择 MDX / React/Vue 运行时

### 2.1 你的偏好与产品目标
- “以后轻量为主”意味着：**尽量让阅读与部署不依赖大型运行时**，并让主题定制主要落在 CSS token 与布局模板上。
- “MDX 有点重”意味着：不把“文档里写组件”作为默认能力，以免引入更复杂的构建、运行时与安全边界。

### 2.2 替代策略（同样可扩展）
- 内容增强走 remark/rehype 插件（构建期）
- 需要交互的能力（搜索、复制、图表渲染）走“少量 JS 模块 + 客户端插件注入”
- 若未来需要组件能力：通过“可选 adapter”引入（例如额外提供 `react-runtime` 包），不影响默认轻量路径

## 3. 工程形态与产物形态（默认）

### 3.1 默认模式：纯静态站点
- `hot-docs build` 输出 `dist/`：
  - `*.html`（按路由预渲染）
  - `assets/`（图片/字体/脚本/样式）
  - `sitemap.xml`、`rss.xml`（若启用插件）
- 任何环境部署方式：
  - Nginx/Apache 静态目录
  - GitHub Pages/GitLab Pages
  - 对象存储 + CDN
  - Docker（nginx 容器托管静态目录）

### 3.2 可选模式：SSR / Server（后续）
- 仅当需要鉴权、动态数据或“私有团队文档”等能力时，通过 adapter 增加，不作为默认路径。

## 4. 插件与主题的技术约束（与选型绑定）

### 4.1 插件（构建期优先）
- 优先扩展：scan/index/render/routes/deploy
- 客户端增强：以“模块注入”为主，避免绑定框架组件体系

### 4.2 主题（CSS Token + 布局模板优先）
- 默认主题以 CSS 变量 token 为核心：暗色层级、微发光边框、高对比图表配色
- 主题可选提供布局模板（HTML 片段/模板引擎），但不强绑定 React/Vue

## 5. 依赖建议清单（后续实现用）

> 这里是“建议候选”，最终以实现阶段的 lockfile 为准。

- 核心：`unified`、`remark-parse`、`remark-gfm`、`remark-rehype`、`rehype-stringify`、`rehype-slug`、`rehype-autolink-headings`
- frontmatter：`gray-matter`
- 高亮：`shiki`
- watch：`chokidar`
- dev 协议：`ws`
- bundler：`esbuild`
- 搜索：`minisearch`（或 `flexsearch`）
- feed：`feed`
- CLI：`cac`（或 `commander`）
- 校验：`zod`

