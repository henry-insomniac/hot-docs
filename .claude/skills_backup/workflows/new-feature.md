# 新功能开发工作流（分支保护版）

## ⚠️ 重要原则

**禁止直接在 main/master 分支开发！**

所有新功能开发必须：
1. ✅ 创建新分支（feature/*）
2. ✅ 在新分支上开发
3. ✅ 编写单元测试
4. ✅ 创建 PR 合并到目标分支

## 适用场景
开发新功能（如增量索引、Blog 分页、插件热重载）

## 标准工作流程

### 步骤 0：检查当前分支 ⚠️
```bash
# 确保在 main 分支开始
git checkout main
git pull origin main
```

**如果不在 main 分支，先切换回 main！**

---

### 步骤 1：需求规划
```bash
/prd 编写功能需求文档
```
**输出：** `docs/requirements.md` 更新或新增功能描述

---

### 步骤 2：架构设计
```bash
/arch 设计功能架构方案
```
**输出：** `docs/architecture.md` 更新或设计文档

---

### 步骤 3：✨ 创建功能分支（必需）
```bash
/branch 创建 [功能描述] 功能分支
```

**自动执行：**
```bash
# 1. 检查当前分支（必须是 main）
# 2. 同步最新主分支
git checkout main
git pull origin main

# 3. 创建并切换到新分支
git checkout -b feature/<scope>/<description>

# 4. 推送到远程
git push -u origin feature/<scope>/<description>
```

**示例分支名：**
- `feature/core/incremental-index`
- `feature/plugins/mermaid-support`
- `feature/themes/neon-dark-enhancement`

**⚠️ 从此刻开始，所有修改都在新分支进行！**

---

### 步骤 4：任务拆分
```bash
/todo 拆分功能为可执行任务
```
**输出：** 细化的任务清单

---

### 步骤 5：功能实现（在新分支）
```bash
/implement 实现核心逻辑
```
**注意：** 所有代码修改都在 `feature/*` 分支

---

### 步骤 6：✨ 编写单元测试（必需）
```bash
/test 编写单元测试和集成测试
```

**测试要求：**
- [ ] 单元测试覆盖核心逻辑
- [ ] 测试边界情况
- [ ] 集成测试验证功能
- [ ] 所有测试通过

**验证：**
```bash
pnpm test
pnpm typecheck
pnpm lint
```

---

### 步骤 7：文档更新
```bash
/docs 更新 API 文档和使用指南
```

---

### 步骤 8：代码提交（在新分支）
```bash
/commit 规范化提交代码
```

**可以多次提交，每个逻辑单元一个提交**

---

### 步骤 9：同步主分支（可选但推荐）
```bash
/sync 同步 main 分支最新代码
```

**处理冲突（如果有）：**
```bash
/sync --resolve
```

---

### 步骤 10：自我审查
```bash
/review-pr --self
```

**检查清单：**
- [ ] 代码质量
- [ ] 架构合规性
- [ ] 测试覆盖
- [ ] 文档完整

---

### 步骤 11：✨ 创建 PR（必需）
```bash
/pr 创建 PR 到 main 分支
```

**自动生成：**
- 完整的 PR 描述
- 关联 Issue
- 测试清单
- 变更说明

**目标分支：** 默认 `main`，可指定：
```bash
/pr --base=develop  # 创建到 develop 分支
```

---

### 步骤 12：等待审查与合并

1. **CI 检查通过**
2. **代码审查通过**
3. **合并到目标分支**
4. **删除功能分支**（可选）

---

## 🚫 禁止的操作

❌ **直接在 main 分支提交代码**
```bash
# 错误示例
git checkout main
git add .
git commit -m "add feature"  # ❌ 禁止！
```

❌ **不经过 PR 直接推送到 main**
```bash
git push origin main  # ❌ 禁止！
```

❌ **跳过单元测试**

---

## ✅ 正确的操作

✅ **始终在功能分支工作**
```bash
git checkout -b feature/xxx
# 开发...
git add .
git commit -m "feat: ..."
git push origin feature/xxx
# 创建 PR
```

✅ **通过 PR 合并代码**

✅ **完整的测试覆盖**

---

## 📋 完整检查清单

### 开始前
- [ ] 在 main 分支
- [ ] main 分支已同步最新代码
- [ ] 需求文档完整（/prd）
- [ ] 架构设计合理（/arch）

### 开发中
- [ ] ✨ 已创建功能分支（/branch）
- [ ] ✨ 所有修改在新分支
- [ ] 任务拆分清晰（/todo）
- [ ] 代码实现完成（/implement）
- [ ] ✨ 单元测试通过（/test）
- [ ] 文档更新完整（/docs）
- [ ] 提交信息规范（/commit）

### 完成时
- [ ] 同步主分支（/sync）
- [ ] 自我审查通过（/review-pr --self）
- [ ] ✨ PR 已创建（/pr）
- [ ] CI 检查通过
- [ ] 代码审查通过

---

## 🎯 预期产出

1. **功能分支：** `feature/<scope>/<description>`
2. **PRD 文档：** 需求说明
3. **架构设计：** 技术方案
4. **实现代码：** 带完整测试
5. **API 文档：** 使用说明
6. **Pull Request：** 完整描述 + 测试清单

---

## 💡 快速命令参考

```bash
# 1. 创建分支
/branch 创建增量索引功能分支

# 2. 实现功能
/implement 实现 ContentIndex 增量更新

# 3. 测试
/test 编写单元测试

# 4. 提交
/commit 实现增量更新核心逻辑

# 5. 同步
/sync

# 6. 创建 PR
/pr 创建 PR 到 main
```

---

## ⚡ 紧急情况处理

### 场景：已经在 main 分支修改了代码

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

### 场景：误提交到 main 分支

**解决方案：**
```bash
# 1. 撤销提交（保留修改）
git reset --soft HEAD~1

# 2. 创建新分支
git checkout -b feature/xxx

# 3. 重新提交
git commit
```

---

**遵循这个流程，确保代码质量和团队协作！** 🚀
