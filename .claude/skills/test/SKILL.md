---
name: test
description: "编写和维护测试用例，确保代码质量和回归保护（TDD强烈推荐）"
category: quality
priority: required
required_before: []
required_after: [commit]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [quality, testing, tdd, coverage]
---

# /test - 测试编写助手

## 描述
编写和维护测试用例，确保代码质量和回归保护。

## 测试策略

### 1. 单元测试
- 核心逻辑（Markdown 渲染、路径规范化）
- 纯函数（无副作用）
- 边界情况

### 2. 集成测试
- 插件加载与执行
- 主题合并
- dev server 热更新

### 3. E2E 测试
- build 产物验证
- 跨平台兼容性

## 工作流程
1. 分析待测试模块
2. 识别关键场景与边界情况
3. 编写测试用例
4. 运行测试验证
5. 补充缺失的测试

## 输入示例
```
/test 为 packages/core/src/render/markdown.ts 编写单元测试
/test 为 ContentIndex 增量更新编写集成测试
/test 补充边界情况测试
```

## 测试模板

### 单元测试示例
```typescript
import { describe, test, expect } from 'vitest';
import { ContentIndex } from './content-index';

describe('ContentIndex', () => {
  test('updateIncremental - 仅更新变更文件', async () => {
    // Arrange
    const index = new ContentIndex();
    await index.addAll([
      { id: 'file1', hash: 'hash1' },
      { id: 'file2', hash: 'hash2' }
    ]);

    // Act
    await index.updateIncremental('file1', 'new-hash1');

    // Assert
    expect(index.get('file1').hash).toBe('new-hash1');
    expect(index.get('file2').hash).toBe('hash2'); // 未变更
  });

  test('updateIncremental - hash 未变化时跳过', async () => {
    const index = new ContentIndex();
    await index.add({ id: 'file1', hash: 'hash1' });

    const spy = vi.spyOn(index, 'parse');
    await index.updateIncremental('file1', 'hash1'); // 相同 hash

    expect(spy).not.toHaveBeenCalled();
  });
});
```

### 集成测试示例
```typescript
describe('DevServer Integration', () => {
  test('文件变更触发增量更新', async () => {
    const server = await createDevServer();
    const ws = await connectWebSocket(server);

    // 修改文件
    await writeFile('content/docs/intro.md', '# Updated');

    // 等待 WebSocket 事件
    const event = await waitForEvent(ws, 'doc-changed');

    expect(event.routePath).toBe('/intro');
    expect(event.hash).toBeTruthy();

    await server.close();
  });
});
```

## 测试覆盖重点

### ContentIndex
- [ ] 增量更新逻辑
- [ ] hash 对比
- [ ] 降级策略

### Watcher
- [ ] 文件变更检测
- [ ] 路径规范化
- [ ] 去抖逻辑

### 插件系统
- [ ] 插件加载
- [ ] manifest 校验
- [ ] hook 执行顺序

## 相关文件
- packages/*/__tests__/**/*.test.ts

## 配合使用的 Skills
- `/implement` - 实现后编写测试
- `/review` - 审查测试覆盖
- `/debug` - 测试失败时调试
