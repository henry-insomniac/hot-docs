# /tech-stack - 技术栈分析

## 描述
分析、选型和更新技术栈决策，确保技术选型符合"轻量、静态优先"原则。

## 适用场景
- 依赖升级评估（unified 11→12）
- 新能力引入（MDX 支持可行性）
- 性能优化选型（搜索引擎对比）
- 技术债务清理（过时依赖替换）

## 工作流程
1. 读取 docs/tech-stack.md
2. 理解"轻量优先"设计原则
3. 调研候选方案的利弊
4. 评估包大小、跨平台兼容性、生态成熟度
5. 更新技术栈文档与依赖清单

## 输入示例
```
/tech-stack 评估是否引入 MDX 支持
/tech-stack 对比 minisearch vs flexsearch 搜索引擎
/tech-stack 评估 shiki vs prism 代码高亮
```

## 决策维度
- 包大小与运行时负担
- 跨平台兼容性
- 生态成熟度与维护活跃度
- 与插件体系的集成难度

## 相关文件
- docs/tech-stack.md
- package.json
- pnpm-lock.yaml
