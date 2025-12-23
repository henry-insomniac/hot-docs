# /migrate - 迁移升级助手

## 描述
辅助版本迁移和升级，生成迁移指南和自动化脚本。

## 迁移场景
- v1.0 → v2.0（内容集合概念引入）
- 插件 apiVersion 升级
- 主题 token 规范变更
- 依赖升级（breaking changes）

## 工作流程
1. 分析版本差异
2. 识别破坏性变更
3. 设计迁移方案
4. 编写迁移清单
5. 生成自动化脚本（可选）
6. 编写迁移文档

## 输入示例
```
/migrate 生成 v1.0 到 v2.0 的迁移指南
/migrate 分析插件 apiVersion 2 的破坏性变更
/migrate 创建配置迁移脚本
```

## 迁移清单模板
- 配置文件变更
- API 变更
- 插件适配
- 自动化脚本

## 相关文件
- docs/migration-*.md
- scripts/migrate-*.ts
