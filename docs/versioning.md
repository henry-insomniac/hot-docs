# 版本与兼容策略（SemVer + apiVersion）

> 目标：让 core/cli/dev-server 的演进可预测，让 theme/plugin 生态可持续。

## 1. 包版本（SemVer）

对外发布的包（例如 `@hot-docs/core`、`@hot-docs/cli`）采用语义化版本（SemVer）：

- **MAJOR**：破坏性变更（Breaking Changes）
- **MINOR**：新增功能（向后兼容）
- **PATCH**：Bug 修复（向后兼容）

在 `0.x` 阶段允许快速迭代，但仍建议遵守：

- 破坏性变更必须在 release notes/迁移指南中明确说明
- 尽量用“新增 + 弃用（deprecate）”替代直接删除

## 2. Theme/Plugin 契约（apiVersion）

主题与插件通过 `package.json#hotDocs.apiVersion` 声明兼容边界：

- core 在加载时校验 `type` 与 `apiVersion`
- **apiVersion 不兼容**：加载失败并给出清晰错误

建议规则：

- `apiVersion` 只在契约破坏时递增（例如字段语义变化、必填项变化、生命周期 hook 变更）
- core 升级时优先保持对旧 `apiVersion` 的兼容，给迁移窗口

## 3. 弃用策略（Deprecation）

当需要调整对外契约（config/theme/plugin）时：

1. 新增替代字段/能力（兼容旧用法）
2. 在文档与日志中标记弃用（deprecate）
3. 在下一个 MINOR/MAJOR 中移除旧能力（取决于影响范围）

## 4. 迁移指南模板（建议）

每次出现破坏性变更，建议提供一份迁移指南，包含：

- 变更摘要（为什么要改）
- 影响范围（哪些用户会受影响）
- 迁移步骤（配置/代码如何改）
- 常见问题（FAQ）

