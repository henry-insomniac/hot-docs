# Hot Docs 分支保护规范

## 📋 概述

本文档定义了 Hot Docs 项目的分支保护策略，确保代码质量和团队协作的规范性。

**核心原则：所有代码修改必须通过功能分支和 Pull Request 流程。**

---

## ⚠️ 强制规则

### 1. 禁止直接在 main 分支提交

**禁止操作：**
```bash
# ❌ 错误：直接在 main 分支修改代码
git checkout main
git add .
git commit -m "fix: something"
git push origin main
```

**正确操作：**
```bash
# ✅ 正确：创建功能分支
git checkout main
git pull origin main
git checkout -b feature/core/new-feature
# 开发...
git add .
git commit -m "feat(core): add new feature"
git push origin feature/core/new-feature
# 创建 PR
```

### 2. 所有合并必须通过 PR

**禁止操作：**
- ❌ 直接合并到 main
- ❌ 使用 `git push --force` 到 main
- ❌ 跳过 CI 检查

**强制要求：**
- ✅ 创建 Pull Request
- ✅ 通过所有 CI 检查
- ✅ 代码审查通过（如适用）
- ✅ 所有测试通过

### 3. 分支命名规范

所有分支必须遵循以下命名规范：

| 分支类型 | 命名格式 | 示例 | 用途 |
|---------|---------|------|------|
| **feature** | `feature/<scope>/<description>` | `feature/core/incremental-index` | 新功能开发 |
| **fix** | `fix/<scope>/<issue>-<description>` | `fix/dev-server/43-windows-path` | Bug 修复 |
| **refactor** | `refactor/<scope>/<description>` | `refactor/core/simplify-scan` | 代码重构 |
| **hotfix** | `hotfix/<version>-<description>` | `hotfix/0.1.1-critical-bug` | 紧急修复 |
| **docs** | `docs/<description>` | `docs/api-reference` | 文档更新 |
| **chore** | `chore/<description>` | `chore/update-deps` | 工程配置 |

**作用域（scope）列表：**
```
core          核心引擎
dev-server    开发服务器
runtime       前端运行时
cli           命令行工具
plugins       插件系统
themes        主题系统
content       内容处理
build         构建系统
docs          文档
```

---

## 🔄 标准工作流程

### 场景 1：开发新功能

```bash
# 1. 确保在 main 分支并同步最新代码
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feature/core/new-feature

# 3. 开发功能
# 编写代码...

# 4. 编写测试
# 编写测试用例...

# 5. 运行测试和检查
pnpm test
pnpm typecheck
pnpm lint

# 6. 提交代码
git add .
git commit -m "feat(core): add new feature

- 实现 XXX 功能
- 支持 YYY 能力
- 添加单元测试

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# 7. 推送到远程
git push -u origin feature/core/new-feature

# 8. 创建 Pull Request
gh pr create --title "feat(core): add new feature" --body "..."

# 9. 等待审查和合并
# CI 通过 → 代码审查 → 合并到 main
```

### 场景 2：修复 Bug

```bash
# 1. 基于 Issue 创建修复分支
git checkout main
git pull origin main
git checkout -b fix/dev-server/43-windows-path

# 2. 编写测试（TDD）
# 先写测试，验证 Bug 存在...

# 3. 修复 Bug
# 修复代码...

# 4. 验证测试通过
pnpm test

# 5. 提交
git add .
git commit -m "fix(dev-server): fix Windows path issue, closes #43

- 问题：Windows 路径分隔符导致路由失败
- 修复：统一使用 POSIX 格式
- 测试：添加 Windows 路径测试用例

Closes #43

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# 6. 推送并创建 PR
git push -u origin fix/dev-server/43-windows-path
gh pr create --title "fix(dev-server): fix Windows path issue" --body "Closes #43"
```

### 场景 3：代码重构

```bash
# 1. 创建重构分支
git checkout main
git pull origin main
git checkout -b refactor/core/simplify-scan

# 2. 确保测试覆盖（重构前）
pnpm test

# 3. 执行重构
# 重构代码...

# 4. 验证测试通过（重构后）
pnpm test

# 5. 提交
git add .
git commit -m "refactor(core): simplify scan logic

- 重构前：handleFileChange 函数 150 行
- 重构后：拆分为 3 个职责清晰的函数
- 测试：所有测试通过，行为一致

Testing: All tests pass, behavior unchanged

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# 6. 推送并创建 PR
git push -u origin refactor/core/simplify-scan
gh pr create --title "refactor(core): simplify scan logic"
```

---

## 🚨 错误恢复

### 场景 1：已经在 main 分支修改了代码

**解决方案：**
```bash
# 1. 暂存当前修改
git stash

# 2. 创建新分支
git checkout -b feature/xxx

# 3. 恢复修改
git stash pop

# 4. 继续正常流程
```

### 场景 2：误提交到 main 分支

**解决方案：**
```bash
# 1. 撤销提交（保留修改）
git reset --soft HEAD~1

# 2. 创建新分支
git checkout -b feature/xxx

# 3. 重新提交
git commit
```

### 场景 3：已经推送到 main 分支

**⚠️ 严重错误，需要立即处理：**

```bash
# 1. 联系团队成员，暂停其他操作

# 2. 创建新分支保存代码
git checkout -b fix/revert-bad-commit

# 3. 回退 main 分支
git checkout main
git revert <commit-hash>
git push origin main

# 4. 在新分支重新开发
# 参考标准流程...
```

---

## 🔍 分支检查清单

### 创建分支前
- [ ] 当前在 main 分支
- [ ] main 分支已同步最新代码（`git pull origin main`）
- [ ] 没有未提交的修改（`git status` 干净）
- [ ] 分支名符合命名规范

### 开发过程中
- [ ] 所有修改在功能分支进行
- [ ] 小步提交，频繁推送
- [ ] 测试持续通过
- [ ] 代码符合规范（`pnpm lint`）

### 创建 PR 前
- [ ] 同步主分支（`git pull origin main`）
- [ ] 解决所有冲突
- [ ] 所有测试通过（`pnpm test`）
- [ ] 类型检查通过（`pnpm typecheck`）
- [ ] 代码规范检查通过（`pnpm lint`）
- [ ] 提交信息规范
- [ ] 文档已更新

### PR 合并后
- [ ] 删除功能分支（可选）
- [ ] 更新本地 main 分支
- [ ] 关联 Issue 自动关闭

---

## 📊 分支生命周期

```
main (受保护)
  │
  ├── feature/core/new-feature
  │   ├── 开发...
  │   ├── 提交...
  │   ├── 测试...
  │   └── PR → 合并到 main → 删除分支
  │
  ├── fix/dev-server/43-bug
  │   ├── 诊断...
  │   ├── 测试...
  │   ├── 修复...
  │   └── PR → 合并到 main → 删除分支
  │
  └── refactor/core/optimize
      ├── 测试（重构前）
      ├── 重构...
      ├── 测试（重构后）
      └── PR → 合并到 main → 删除分支
```

---

## 🛠️ 配置说明

### config.json 配置

分支保护规则在 `.claude/skills/config.json` 中定义：

```json
{
  "hotDocsSpecific": {
    "branchProtection": {
      "enabled": true,
      "protectedBranches": ["main", "master"],
      "rules": {
        "noDirectCommits": true,
        "requirePR": true,
        "requireBranchNaming": true,
        "requireTests": true
      },
      "branchTypes": {
        "feature": "feature/<scope>/<description>",
        "fix": "fix/<scope>/<issue>-<description>",
        "refactor": "refactor/<scope>/<description>",
        "hotfix": "hotfix/<version>-<description>",
        "docs": "docs/<description>",
        "chore": "chore/<description>"
      }
    }
  }
}
```

### GitHub 分支保护设置（推荐）

在 GitHub 仓库设置中配置分支保护规则：

**Settings → Branches → Branch protection rules → Add rule**

针对 `main` 分支：
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - CI 测试
  - 类型检查
  - Lint 检查
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

---

## 💡 最佳实践

### 1. 分支粒度

**推荐：**
- 一个分支解决一个问题
- 保持 PR 小而聚焦
- 相关功能可以拆分多个 PR

**避免：**
- 一个分支包含多个不相关修改
- 巨型 PR（> 500 行修改）

### 2. 提交频率

**推荐：**
- 完成一个逻辑单元就提交
- 每天至少推送一次
- 保持提交历史清晰

**避免：**
- 几天不提交
- 一次提交包含所有修改

### 3. 分支同步

**推荐：**
```bash
# 定期同步主分支
git checkout feature/xxx
git fetch origin
git rebase origin/main
```

**避免：**
- 长期不同步主分支
- 合并时才发现大量冲突

### 4. PR 描述

**推荐：**
- 清晰描述变更内容
- 关联相关 Issue
- 提供测试清单
- 说明破坏性变更

**避免：**
- 空白或敷衍的描述
- 不关联 Issue
- 不说明测试情况

---

## 📚 相关文档

- [新功能开发工作流](./workflows/new-feature.md)
- [Bug 修复工作流](./workflows/bug-fix.md)
- [代码重构工作流](./workflows/refactor.md)
- [Skills 使用指南](./README.md)

---

## 🤝 团队协作

### 代码审查

- 所有 PR 建议进行代码审查（个人项目可自审）
- 使用 `/review-pr --self` 进行自我审查
- 关注架构合规性、测试覆盖、代码质量

### 沟通原则

- PR 标题清晰简洁
- PR 描述完整详细
- 及时响应审查意见
- 合并后删除功能分支

---

## ⚡ 紧急情况处理

### 生产环境紧急 Bug

对于需要立即修复的生产环境 Bug：

```bash
# 1. 创建 hotfix 分支
git checkout main
git pull origin main
git checkout -b hotfix/0.1.1-critical-bug

# 2. 快速修复 + 测试
# 修复...
pnpm test

# 3. 提交
git commit -m "fix: critical bug in production"

# 4. 创建 PR（标记为紧急）
gh pr create --title "🚨 HOTFIX: critical bug" --label "priority:critical"

# 5. 加速审查和合并
# 合并后立即发布
```

---

## 📖 常见问题 FAQ

### Q1: 为什么不能直接在 main 分支提交？

**A:** 分支保护策略的核心目标：
1. **代码质量**：通过 PR 流程确保代码经过审查和测试
2. **历史清晰**：避免混乱的提交历史
3. **协作安全**：防止多人同时修改导致冲突
4. **回滚容易**：每个 PR 是独立的变更单元

### Q2: 个人项目也需要遵循吗？

**A:** 是的，即使是个人项目，分支保护策略也有价值：
- 养成良好的开发习惯
- 保持代码库整洁
- 便于后续协作
- 可以使用 `/review-pr --self` 自我审查

### Q3: 忘记创建分支，已经在 main 上修改了怎么办？

**A:** 参考 [错误恢复 - 场景 1](#场景-1已经在-main-分支修改了代码)

### Q4: 分支命名一定要严格遵守吗？

**A:** 是的，统一的命名规范带来：
- 清晰的分支用途识别
- 便于自动化工具处理
- 更好的团队协作体验

### Q5: PR 可以合并自己创建的吗？

**A:**
- 个人项目：可以，但建议使用 `/review-pr --self` 自审
- 团队项目：建议至少一人审查后合并

---

**遵循这个规范，确保代码质量和团队协作效率！** 🚀
