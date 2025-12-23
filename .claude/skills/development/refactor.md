# /refactor - 代码重构助手

## 描述
系统性重构代码，保持架构清晰，提升代码质量和可维护性。

## ⚠️ 重要原则

**禁止直接在 main/master 分支重构代码！**

所有重构必须：
1. ✅ 先使用 `/branch` 创建重构分支（refactor/*）
2. ✅ 在新分支上重构
3. ✅ 确保测试通过（重构前后行为一致）
4. ✅ 完成后创建 PR 合并

**建议流程：** `/branch` → `/test`（重构前） → `/refactor` → `/test`（验证） → `/commit` → `/pr`

**详细工作流：** 参考 `.claude/skills/workflows/refactor.md`

## 适用场景
- 模块职责边界优化
- 性能瓶颈重构
- 技术债务清理
- 代码复杂度降低

## 重构原则

### 1. 保持分层边界
- 不引入跨层依赖
- 保持模块职责单一

### 2. 向后兼容
- 插件 API 稳定
- 配置文件兼容
- 破坏性变更需升级 apiVersion

### 3. 测试覆盖
- 重构前后行为一致
- 回归测试通过

### 4. 增量进行
- 避免大爆炸式重构
- 逐步迁移，保持可发布状态

## 工作流程
1. 识别重构目标（复杂度/性能/架构）
2. 设计重构方案（保持兼容性）
3. 编写测试覆盖当前行为
4. 执行重构（小步迭代）
5. 验证测试通过
6. 更新文档

## 输入示例
```
/refactor 优化 scan.ts，将文件忽略规则抽象为可插件化的过滤器
/refactor 降低 handleFileChange 函数复杂度
/refactor 提取公共路径规范化逻辑
```

## 常见重构模式

### 1. 提取方法
```typescript
// 重构前：复杂函数
function handleFileChange(file) {
  // 50 行代码...
}

// 重构后：拆分子函数
function handleFileChange(file) {
  const hash = computeHash(file);
  const entry = parseFile(file);
  updateIndex(entry, hash);
}
```

### 2. 提取接口
```typescript
// 重构前：直接依赖实现
class ContentIndex {
  private fs = require('fs');
}

// 重构后：依赖接口
interface FileSystem {
  read(path: string): Promise<string>;
}

class ContentIndex {
  constructor(private fs: FileSystem) {}
}
```

### 3. 策略模式
```typescript
// 重构前：if-else 链
if (type === 'add') {
  // ...
} else if (type === 'change') {
  // ...
} else if (type === 'unlink') {
  // ...
}

// 重构后：策略模式
const handlers = {
  add: handleAdd,
  change: handleChange,
  unlink: handleUnlink
};
handlers[type](file);
```

## 相关文件
- packages/*/src/**/*.ts

## 配合使用的 Skills
- `/branch` - **【必需】** 重构前创建分支（refactor/*）
- `/review` - 重构前审查代码
- `/test` - 重构前后测试覆盖
- `/commit` - 重构完成后提交
- `/pr` - **【必需】** 创建 PR 合并到目标分支
