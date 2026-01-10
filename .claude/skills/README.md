# Hot Docs Claude Skills 使用指南

## 📋 概述

这是 Hot Docs 项目的 Claude Skills 体系，包含 **29 个专业 Skills**，覆盖从需求规划到版本发布的完整产品开发流程。

### 核心价值

- ✅ **全流程覆盖**：从需求到发布的完整工作流
- ✅ **Hot Docs 特化**：插件/主题开发专属 Skills
- ✅ **标准化实践**：架构分层/安全边界/性能优化内置规范
- ✅ **开源友好**：贡献指南/迁移工具/发布自动化
- ✅ **分支保护**：强制分支工作流，确保代码质量

## ⚠️ 重要：分支保护策略

**所有代码修改必须在功能分支进行，禁止直接在 main 分支提交！**

详细规范请阅读：**[分支保护规范文档](./BRANCH_PROTECTION.md)**

快速规则：
- ✅ 使用 `/branch` 创建功能分支
- ✅ 在新分支开发/修复/重构
- ✅ 使用 `/pr` 创建 Pull Request 合并
- ❌ 禁止直接在 main 分支提交
- ❌ 禁止直接推送到 main 分支

---

## 🎯 Skills 分类（29 个）

### 📐 规划类（4 个）
| Skill | 描述 | 使用示例 |
|-------|------|----------|
| `/prd` | 需求文档管理 | `/prd 设计 Blog 草稿功能需求` |
| `/arch` | 架构设计维护 | `/arch 设计增量索引机制` |
| `/tech-stack` | 技术栈分析 | `/tech-stack 评估 MDX 支持可行性` |
| `/roadmap` | 路线图规划 | `/roadmap 规划 v0.2.0 版本` |

### 📋 管理类（2 个）
| Skill | 描述 | 使用示例 |
|-------|------|----------|
| `/todo` | 任务管理助手 | `/todo 拆分 M1 Build adapter 任务` |
| `/milestone` | 里程碑跟踪 | `/milestone 查看 M1 进度` |

### 💻 开发类（5 个）
| Skill | 描述 | 使用示例 |
|-------|------|----------|
| `/implement` | 功能实现助手 | `/implement 实现增量索引更新` |
| `/plugin` | 插件开发专家 ⭐ | `/plugin 创建 Mermaid 插件` |
| `/theme` | 主题开发专家 ⭐ | `/theme 完善 Neon Dark 主题` |
| `/refactor` | 代码重构助手 | `/refactor 优化 scan.ts 复杂度` |
| `/debug` | 调试修复专家 | `/debug Windows 路径问题` |

### 🔍 质量类（4 个）
| Skill | 描述 | 使用示例 |
|-------|------|----------|
| `/review` | 代码审查助手 | `/review 审查 scan.ts 修改` |
| `/test` | 测试编写助手 | `/test 为 ContentIndex 编写测试` |
| `/perf` | 性能优化专家 | `/perf 分析 dev server 启动耗时` |
| `/security` | 安全审计专家 | `/security 审计路径安全` |

### 📝 文档类（3 个）
| Skill | 描述 | 使用示例 |
|-------|------|----------|
| `/docs` | 技术文档助手 | `/docs 编写插件开发指南` |
| `/guide` | 用户指南助手 | `/guide 编写快速开始教程` |
| `/contributing` | 贡献指南助手 | `/contributing 编写 CONTRIBUTING.md` |

### 🔧 工具类（4 个）
| Skill | 描述 | 使用示例 |
|-------|------|----------|
| `/analyze` | 代码库深度分析 | `/analyze 分析模块依赖关系` |
| `/migrate` | 迁移升级助手 | `/migrate 生成 v1→v2 迁移指南` |
| `/build` | 构建打包助手 | `/build 配置子路径部署` |
| `/deploy` | 部署配置助手 | `/deploy 配置 GitHub Pages` |

### 📦 版本控制类（7 个）
| Skill | 描述 | 使用示例 |
|-------|------|----------|
| `/branch` | 分支创建与管理 | `/branch 创建增量索引功能分支` |
| `/sync` | 分支同步管理 | `/sync 同步主分支最新代码` |
| `/commit` | 规范化提交 | `/commit 实现增量更新功能` |
| `/pr` | PR 创建与管理 | `/pr 为增量更新创建 PR` |
| `/review-pr` | PR 审查助手 | `/review-pr 45` |
| `/release` | 版本发布助手 | `/release --minor` |
| `/changelog` | 变更日志生成 | `/changelog 生成 v0.1.0 变更日志` |

---

## 🚀 快速开始

### 场景 1：开发新功能（增量索引）

```bash
# 1. 编写需求文档
/prd 设计增量索引需求

# 2. 设计架构方案
/arch 设计增量索引数据流

# 3. 创建功能分支
/branch 创建增量索引功能分支

# 4. 拆分任务
/todo 拆分增量索引实现任务

# 5. 实现功能
/implement 实现 ContentIndex 增量更新

# 6. 编写测试
/test 为增量更新编写测试

# 7. 更新文档
/docs 更新 ContentIndex API 文档

# 8. 提交代码
/commit 实现增量索引更新功能

# 9. 创建 PR
/pr 为增量更新创建 PR

# 10. 自我审查
/review-pr --self
```

### 场景 2：开发插件（Mermaid）

```bash
# 1. 设计插件
/plugin 设计 Mermaid 插件架构

# 2. 实现插件
/plugin 创建 @hot-docs/plugin-mermaid

# 3. 编写测试
/test 编写 Mermaid 插件测试

# 4. 编写文档
/docs 编写 Mermaid 插件文档

# 5. 提交代码
/commit feat(plugins) 添加 Mermaid 支持

# 6. 创建 PR
/pr 创建 Mermaid 插件 PR
```

### 场景 3：修复 Bug

```bash
# 1. 创建修复分支
/branch 基于 Issue #43 创建分支

# 2. 诊断问题
/debug Windows 路径分隔符问题

# 3. 编写测试
/test 编写路径规范化测试

# 4. 提交修复
/commit fix(core) 修复 Windows 路径问题，closes #43

# 5. 创建 PR
/pr 创建路径修复 PR
```

### 场景 4：发布版本

```bash
# 1. 检查里程碑
/milestone 评估 M1 完成度

# 2. 生成变更日志
/changelog 生成 v0.1.0 变更日志

# 3. 构建验证
/build 执行生产构建

# 4. 发布版本
/release --minor
```

---

## 📊 工作流模板

项目预置了 5 个常用工作流模板（**全部强制分支保护**）：

### 1. 新功能开发
路径：`.claude/skills/workflows/new-feature.md`

完整流程：需求 → 架构 → **分支（必需）** → 实现 → 测试 → 文档 → 提交 → 同步 → 自审 → **PR（必需）**

### 2. Bug 修复
路径：`.claude/skills/workflows/bug-fix.md`

快速流程：**分支（必需）** → 诊断 → 测试（TDD） → 修复 → 提交 → 同步 → 自审 → **PR（必需）**

### 3. 代码重构
路径：`.claude/skills/workflows/refactor.md`

重构流程：**分支（必需）** → 测试（重构前） → 重构 → 测试（验证） → 提交 → 同步 → 自审 → **PR（必需）**

### 4. 插件开发
路径：`.claude/skills/workflows/plugin-development.md`

专项流程：**分支** → 设计 → 实现 → 测试 → 文档 → 提交 → **PR**

### 5. 版本发布
路径：`.claude/skills/workflows/release.md`

发布流程：里程碑 → 变更日志 → 构建 → 发布

---

## 🎨 Hot Docs 特有 Skills

### `/plugin` - 插件开发专家

**Hot Docs 插件体系核心 Skill**

支持的插件类型：
- **content**：扩展 Markdown 能力（Mermaid/KaTeX）
- **site**：扩展站点能力（搜索/导航）
- **dev**：扩展开发能力（overlay/诊断）
- **deploy**：扩展部署能力（redirects/headers）

使用示例：
```bash
/plugin 创建 Mermaid 图表支持插件
/plugin 创建本地搜索插件
/plugin 调试插件加载失败问题
```

### `/theme` - 主题开发专家

**Hot Docs 主题体系核心 Skill**

支持的主题组件：
- **Docs 组件**：Layout/Sidebar/DocPage/TOC/Navbar
- **Blog 组件**：BlogIndex/BlogPost/TaxonomyPage
- **通用组件**：HomePage/NotFound

使用示例：
```bash
/theme 完善 Neon Dark 主题的代码块样式
/theme 设计轻量白色主题
/theme 实现主题切换功能
```

---

## 📂 目录结构

```
.claude/skills/
├── README.md               # 本文件
├── config.json             # Skills 配置（含 workflows）
├── BRANCH_PROTECTION.md    # 分支保护规范（必读）
├── SUPERPOWERS_ANALYSIS.md # Superpowers 对标分析
├── OPTIMIZATION_PLAN.md    # 优化实施计划
├── OPTIMIZATION_SUMMARY.md # 优化总结
├── diagrams/               # Graphviz 流程/架构图
│   ├── README.md
│   ├── *.dot
│   └── render-all.sh
├── workflows/              # 工作流模板
│   ├── new-feature.md
│   ├── bug-fix.md
│   ├── refactor.md
│   ├── plugin-development.md
│   └── release.md
├── prd/                    # 每个 Skill 一个目录
│   ├── SKILL.md            # 主文件（含 YAML frontmatter）
│   ├── examples/           # 可选
│   └── templates/          # 可选
├── arch/
│   └── SKILL.md
├── ...                     # 其余 skills（共 29 个）
└── build/
    └── SKILL.md
```

---

## ⚙️ 配置说明

### config.json 结构

```json
{
  "version": "2.0.0",
  "structure": {
    "format": "independent-directories",
    "skillFile": "SKILL.md",
    "supportingDirs": ["examples", "templates"],
    "metadataFormat": "yaml-frontmatter"
  },
  "skills": {
    "prd": { "category": "planning", ... },
    "arch": { "category": "planning", ... },
    "...": { ... }
  },
  "workflows": {
    "new-feature": { "steps": ["/prd", "...", "/pr"] },
    "bug-fix": { "steps": ["/branch", "...", "/pr"] }
  },
  "hotDocsSpecific": { ... }
}
```

### Hot Docs 架构约束

**五层架构边界：**
```
Ecosystem (主题/插件生态)
    ↓
Runtime (前端运行时)
    ↓
Adapters (DevServer/Build/Deploy)
    ↓
Core (内容引擎/渲染管线/插件宿主)
    ↓
Foundation (文件系统/Watch/缓存)
```

**依赖规则：**
- ✅ 上层可以依赖下层
- ❌ 下层不得依赖上层
- ❌ 同层避免循环依赖
- ✅ 跨层依赖必须通过稳定契约

---

## 💡 最佳实践

### 1. 优先级建议

**第一批（立即可用）：**
- `/todo` - 管理 docs/todo.md
- `/implement` - 实现 M1-M5 功能
- `/debug` - 修复问题
- `/commit` - 规范提交

**第二批（M1-M2 阶段）：**
- `/plugin` - 开发示例插件
- `/theme` - 完善 Neon Dark 主题
- `/test` - 补充测试覆盖
- `/docs` - 编写插件/主题开发文档

**第三批（开源准备）：**
- `/contributing` - 贡献指南
- `/guide` - 用户手册
- `/release` - 版本发布
- `/changelog` - 变更日志

### 2. 工作流选择

| 任务类型 | 推荐工作流 |
|---------|-----------|
| 新功能 | `workflows/new-feature.md` |
| Bug修复 | `workflows/bug-fix.md` |
| 插件开发 | `workflows/plugin-development.md` |
| 主题开发 | 参考插件流程，使用 `/theme` |
| 版本发布 | `workflows/release.md` |

### 3. Skill 组合使用

**架构相关：**
```bash
/prd → /arch → /tech-stack → /implement
```

**质量保证：**
```bash
/implement → /test → /review → /security
```

**发布流程：**
```bash
/milestone → /changelog → /build → /release
```

---

## 📈 预期收益

| 指标 | 提升幅度 |
|------|---------|
| 需求文档编写效率 | ⬇️ 70% 时间 |
| 架构设计效率 | ⬇️ 60% 时间 |
| 任务拆分效率 | ⬇️ 80% 时间 |
| 插件开发效率 | 从 2-3天 → 4-6小时 |
| 主题开发效率 | 从 1周 → 2-3天 |

---

## 🤝 贡献

如果您发现 Skill 定义有改进空间，欢迎提交 PR 或 Issue！

### 添加新 Skill

1. 创建目录：`.claude/skills/<skill-id>/`
2. 添加主文件：`.claude/skills/<skill-id>/SKILL.md`（含 YAML frontmatter）
3. （可选）补充 `examples/`、`templates/` 等配套文件
4. 更新 `.claude/skills/config.json` 的 `skills.<skill-id>` 配置
5. 更新本 README 的 Skills 列表/说明（如有变更）

### Skill 文档格式

```markdown
---
name: <skill-id>
description: "一句话说明这个 skill 解决什么问题"
category: <planning|management|development|quality|documentation|tools|versioning>
priority: <required|recommended|optional>
required_before: []
required_after: []
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [tag1, tag2]
---

# /<skill-name> - Skill 名称

## 描述
简短说明（1-2 句话）

## 适用场景
- 场景 1
- 场景 2

## 工作流程
1. 步骤 1
2. 步骤 2

## 输入示例
\`\`\`
/<skill-name> 参数说明
\`\`\`

## 相关文件
- 文件路径

## 配合使用的 Skills
- /other-skill
```

---

## 📞 支持

- **分支保护规范**：**[BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md)** ⚠️ 必读
- **文档问题**：查看各 Skill 的详细文档（`.claude/skills/<skill>/SKILL.md`）
- **工作流问题**：参考工作流模板（`.claude/skills/workflows/`）
- **配置问题**：查看 `config.json`

---

## 📝 版本历史

### v2.0.0 (2025-12-24)
- ✨ 独立 Skill 目录结构（`<skill>/SKILL.md`）
- ✨ YAML frontmatter 元数据（29 个 skills）
- ✨ Graphviz 可视化（`.claude/skills/diagrams/`）
- ✨ 工作流模板（`.claude/skills/workflows/`）
- 🔒 分支保护规范（`BRANCH_PROTECTION.md`）

### v1.1.0 (2025-12-23)
- 🔒 **分支保护策略**：强制分支工作流
  - 添加 `BRANCH_PROTECTION.md` 规范文档
  - 更新所有工作流模板（new-feature, bug-fix, refactor）
  - 更新 6 个开发/版本控制 Skills 文档
  - 在 `config.json` 添加分支保护配置
- ✨ 新增重构工作流（`workflows/refactor.md`）
- 📝 更新 README，强调分支保护

### v1.0.0 (2025-12-23)
- ✨ 初始版本
- ✅ 29 个 Skills 定义
- ✅ 4 个工作流模板
- ✅ 完整配置文件
- ✅ Hot Docs 特化（插件/主题）

---

**Happy Coding with Claude Skills! 🚀**
