# /arch - 架构设计维护

## 描述
设计、更新和审查系统架构文档，确保架构清晰、分层合理、可扩展性强。

## 适用场景
- 新模块设计（SSR adapter、插件沙箱）
- 架构重构（增量索引优化）
- 数据流梳理（dev 热更新链路）
- 扩展点设计（插件 hook、主题契约）

## 工作流程
1. 读取 docs/architecture.md
2. 分析五层架构边界与依赖规则
3. 设计模块接口与数据流
4. 验证分层依赖（不跨层）
5. 更新架构图与文档

## 输入示例
```
/arch 设计增量索引更新机制
/arch 梳理 dev 模式热更新数据流
/arch 设计插件 onFileChanged hook
```

## 相关文件
- docs/architecture.md
- docs/requirements.md
- packages/*/src/**/*.ts
