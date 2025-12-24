# 代码重构工作流（分支保护版）

## ⚠️ 重要原则

**禁止直接在 main/master 分支重构代码！**

所有重构必须：
1. ✅ 创建重构分支（refactor/*）
2. ✅ 在新分支上重构
3. ✅ 确保测试通过（重构前后行为一致）
4. ✅ 创建 PR 合并到目标分支

## 适用场景
- 模块职责边界优化
- 性能瓶颈重构
- 技术债务清理
- 代码复杂度降低

## 标准工作流程

### 步骤 0：检查当前分支 ⚠️
```bash
git checkout main
git pull origin main
```

---

### 步骤 1：✨ 创建重构分支（必需）
```bash
/branch 创建 [重构描述] 重构分支
```

**示例分支名：**
- `refactor/core/simplify-scan-logic`
- `refactor/plugins/extract-common-utils`
- `refactor/themes/token-system-redesign`

**⚠️ 从此刻开始，所有修改都在新分支进行！**

---

### 步骤 2：重构前准备

#### A. 确保测试覆盖
```bash
/test 补充测试覆盖当前代码行为
```

**重要：** 重构前必须有测试保护！

#### B. 运行测试基线
```bash
pnpm test       # 记录当前测试状态
pnpm typecheck
pnpm lint
```

---

### 步骤 3：重构实现（在新分支）
```bash
/refactor 执行重构
```

**重构原则：**
- 保持对外接口不变（向后兼容）
- 小步迭代，每次提交一个改进
- 持续运行测试验证

---

### 步骤 4：验证行为一致
```bash
pnpm test       # 所有测试必须通过
pnpm typecheck
pnpm lint
```

**确保：**
- [ ] 重构前后行为完全一致
- [ ] 没有破坏现有功能
- [ ] 性能没有退化（如适用）

---

### 步骤 5：代码提交（在新分支）
```bash
/commit 提交重构代码
```

**提交格式：**
```
refactor(<scope>): 描述

- 重构前的问题
- 重构后的改进
- 性能/可维护性提升

Testing: All tests pass, behavior unchanged
```

---

### 步骤 6：性能对比（如适用）
```bash
/perf 性能测试对比
```

**对比指标：**
- 执行时间
- 内存占用
- 代码复杂度

---

### 步骤 7：文档更新
```bash
/docs 更新相关文档
```

**如果重构影响：**
- API 文档
- 架构文档
- 最佳实践指南

---

### 步骤 8：同步主分支
```bash
/sync 同步 main 分支最新代码
```

---

### 步骤 9：自我审查
```bash
/review-pr --self
```

---

### 步骤 10：✨ 创建 PR（必需）
```bash
/pr 创建重构 PR 到 main
```

**PR 描述包含：**
- 重构动机
- 改进说明
- 性能影响
- 向后兼容性说明

---

## 🚫 禁止的操作

❌ **直接在 main 分支重构**
❌ **没有测试保护的重构**
❌ **破坏向后兼容性**
❌ **大爆炸式重构（Big Bang Refactoring）**

---

## ✅ 正确的操作

✅ **在重构分支工作**
✅ **测试驱动的重构（有测试保护）**
✅ **小步迭代**
✅ **通过 PR 合并**

---

## 📋 完整检查清单

### 开始前
- [ ] 在 main 分支
- [ ] main 分支已同步最新代码
- [ ] ✨ 已创建重构分支（/branch）
- [ ] ✨ 现有测试覆盖充分

### 重构中
- [ ] ✨ 所有修改在新分支
- [ ] 小步迭代，频繁提交
- [ ] ✨ 测试持续通过
- [ ] 向后兼容性保持
- [ ] 提交信息规范（/commit）

### 完成时
- [ ] 同步主分支（/sync）
- [ ] 性能对比（如适用）
- [ ] 文档更新（/docs）
- [ ] 自我审查通过（/review-pr --self）
- [ ] ✨ PR 已创建（/pr）

---

## 🎯 预期产出

1. **重构分支：** `refactor/<scope>/<description>`
2. **重构代码：** 更清晰、更易维护
3. **测试验证：** 行为一致性证明
4. **Pull Request：** 完整重构说明

---

## 💡 快速命令参考

```bash
# 1. 创建重构分支
/branch 创建简化 scan 逻辑重构分支

# 2. 补充测试
/test 为 scan.ts 补充测试

# 3. 执行重构
/refactor 简化 handleFileChange 函数

# 4. 验证
pnpm test && pnpm typecheck

# 5. 提交
/commit refactor(core) 简化 scan 逻辑

# 6. 创建 PR
/pr 创建重构 PR 到 main
```

---

**安全重构，持续改进！** ♻️✨
