# Bug 修复工作流（分支保护版）

## ⚠️ 重要原则

**禁止直接在 main/master 分支修复 Bug！**

所有 Bug 修复必须：
1. ✅ 创建修复分支（fix/*）
2. ✅ 在新分支上修复
3. ✅ 编写回归测试
4. ✅ 创建 PR 合并到目标分支

## 适用场景
修复已知 Bug（路径问题、插件加载失败、内存泄漏）

## 标准工作流程

### 步骤 0：检查当前分支 ⚠️
```bash
# 确保在 main 分支开始
git checkout main
git pull origin main
```

---

### 步骤 1：✨ 创建修复分支（必需）
```bash
/branch 基于 Issue #XX 创建修复分支
```

**自动执行：**
```bash
# 1. 检查当前分支（必须是 main）
# 2. 同步最新主分支
git checkout main
git pull origin main

# 3. 创建并切换到修复分支
git checkout -b fix/<scope>/<issue-number>-<description>

# 4. 推送到远程
git push -u origin fix/<scope>/<issue-number>-<description>
```

**示例分支名：**
- `fix/core/43-windows-path-issue`
- `fix/dev-server/47-plugin-loading-failure`
- `fix/runtime/51-memory-leak`

**⚠️ 从此刻开始，所有修改都在新分支进行！**

---

### 步骤 2：问题诊断
```bash
/debug 诊断问题根因
```

**诊断步骤：**
- 复现问题
- 收集信息
- 定位根因
- 设计修复方案

---

### 步骤 3：✨ 编写测试（先测试后修复 - TDD）
```bash
/test 编写复现 Bug 的测试用例
```

**测试要求：**
- [ ] 测试应该失败（验证 Bug 存在）
- [ ] 覆盖边界情况
- [ ] 包含回归测试

**示例：**
```typescript
describe('路径规范化', () => {
  test('Windows 路径应该转换为 POSIX 格式', () => {
    const input = 'docs\\guide\\intro.md';
    const expected = 'docs/guide/intro.md';

    const result = normalizePath(input);

    expect(result).toBe(expected); // 当前会失败
  });
});
```

---

### 步骤 4：修复实现（在新分支）
```bash
/implement 修复 Bug
```

**修复原则：**
- 添加防御性代码
- 最小化改动范围
- 不引入新功能

---

### 步骤 5：验证测试通过
```bash
pnpm test       # 所有测试通过
pnpm typecheck  # 类型检查
pnpm lint       # 代码规范
```

**确保：**
- [ ] 之前失败的测试现在通过
- [ ] 没有破坏其他测试
- [ ] 所有 CI 检查通过

---

### 步骤 6：回归测试
```bash
/test 补充回归测试
```

**确保修复不引入新问题**

---

### 步骤 7：代码提交（在新分支）
```bash
/commit 提交修复代码
```

**提交格式：**
```
fix(<scope>): 描述，closes #XX

- 问题现象
- 根因分析
- 修复方案

Closes #XX
```

---

### 步骤 8：同步主分支（可选）
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
/pr 创建修复 PR 到 main
```

**PR 描述包含：**
- 问题现象
- 根因分析
- 修复方案
- 测试覆盖
- 影响范围

---

### 步骤 11：等待审查与合并

1. **CI 检查通过**
2. **代码审查通过**
3. **合并到目标分支**
4. **关联 Issue 自动关闭**

---

## 🚫 禁止的操作

❌ **直接在 main 分支修复 Bug**
```bash
git checkout main
git add .
git commit -m "fix: bug"  # ❌ 禁止！
```

❌ **没有测试的修复**

❌ **不经过 PR 的热修复**

---

## ✅ 正确的操作

✅ **在修复分支工作**
```bash
git checkout -b fix/xxx
# 修复...
git add .
git commit -m "fix: ..."
git push origin fix/xxx
# 创建 PR
```

✅ **测试驱动的修复（TDD）**

✅ **通过 PR 合并**

---

## 📋 完整检查清单

### 开始前
- [ ] 在 main 分支
- [ ] main 分支已同步最新代码
- [ ] ✨ 已创建修复分支（/branch）

### 修复中
- [ ] ✨ 所有修改在新分支
- [ ] 问题诊断完成（/debug）
- [ ] ✨ 测试用例编写（/test）
- [ ] Bug 修复完成
- [ ] ✨ 测试通过
- [ ] 提交信息规范（/commit）

### 完成时
- [ ] 同步主分支（/sync）
- [ ] 自我审查通过（/review-pr --self）
- [ ] ✨ PR 已创建（/pr）
- [ ] CI 检查通过

---

## 🎯 预期产出

1. **修复分支：** `fix/<scope>/<issue>-<description>`
2. **修复代码：** 最小化改动
3. **测试用例：** 回归测试
4. **Pull Request：** 完整根因分析

---

## 💡 快速命令参考

```bash
# 1. 创建修复分支
/branch 基于 Issue #43 创建分支

# 2. 诊断问题
/debug Windows 路径问题

# 3. 编写测试
/test 编写路径规范化测试

# 4. 提交
/commit fix(core) 修复 Windows 路径问题，closes #43

# 5. 创建 PR
/pr 创建 PR 到 main
```

---

## ⚡ 紧急 Hotfix 处理

对于生产环境紧急 Bug：

```bash
# 1. 从 main 创建 hotfix 分支
/branch 创建紧急修复分支
# 分支名：hotfix/<version>-<description>

# 2. 快速修复 + 测试
/debug + /test + /implement

# 3. 提交
/commit fix: 紧急修复 XXX

# 4. 创建 PR（优先级最高）
/pr --base=main 创建紧急修复 PR

# 5. 合并后立即发布
/release --patch
```

---

**遵循这个流程，确保 Bug 修复质量！** 🐛✅
