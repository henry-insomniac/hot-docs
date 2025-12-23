# /perf - 性能优化专家

## 描述
性能分析与优化，包括响应时间、内存占用、构建速度等。

## 优化场景
- 首屏加载优化（< 2s）
- 文件变更响应优化（< 1s）
- 大规模站点支持（> 2000 篇文档）
- 插件链耗时优化

## 性能指标

### Dev Server
- 首次启动时间：< 2s
- 文件变更响应：< 1s
- 内存占用：< 100MB（中等站点）

### Build
- 构建速度：< 10s / 100 pages
- 产物大小：合理范围
- 增量构建支持

### Runtime
- 首屏渲染：< 1s
- 路由切换：< 200ms
- 搜索响应：< 100ms

## 工作流程
1. 性能分析（profiling）
2. 识别瓶颈
3. 设计优化方案
4. 实现优化
5. 验证效果
6. 回归测试

## 输入示例
```
/perf 分析 dev server 首次启动耗时
/perf 优化 Markdown 渲染性能
/perf 分析内存泄漏问题
```

## 优化策略

### 1. 增量化
- scan/index/render 按需执行
- 避免全量更新

### 2. 缓存
- 基于文件 hash 缓存渲染产物
- 缓存插件执行结果

### 3. 并行化
- 多文档并行解析
- 插件并行执行（如可行）

### 4. 懒加载
- 搜索索引按需构建
- 图片懒加载

## 性能分析工具

### Node.js Profiler
```bash
node --prof packages/cli/dist/index.js dev
node --prof-process isolate-*.log > profile.txt
```

### 插件耗时统计
```typescript
class PluginHost {
  private metrics = new Map();

  async executeHook(plugin, hook, ...args) {
    const start = performance.now();
    const result = await plugin[hook](...args);
    const duration = performance.now() - start;

    this.metrics.set(`${plugin.name}:${hook}`, duration);
    return result;
  }

  getMetrics() {
    return Array.from(this.metrics.entries())
      .sort((a, b) => b[1] - a[1]);
  }
}
```

## 相关文件
- packages/*/src/**/*.ts

## 配合使用的 Skills
- `/analyze` - 分析性能瓶颈
- `/refactor` - 重构优化代码
- `/test` - 验证优化效果
