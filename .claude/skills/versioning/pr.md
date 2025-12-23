# /pr - PR 创建与管理

## 描述
创建和管理 Pull Request，生成完整的 PR 描述。

## PR 类型
- Feature PR（新功能）
- Bugfix PR（修复）
- Hotfix PR（紧急修复）
- Refactor PR（重构）
- Documentation PR（文档）

## 工作流程
1. 检查分支状态
2. 同步主分支
3. 分析提交历史和代码变更
4. 生成 PR 描述
5. 创建 PR（使用 gh cli）
6. 设置标签、审查者、里程碑

## 输入示例
```
/pr 为 ContentIndex 增量更新创建 PR
/pr --base=develop 创建到 develop 分支的 PR
/pr --draft 创建草稿 PR
```

## PR 描述模板
- 变更说明
- 关联 Issue
- 变更类型
- 实现方案
- 测试清单
- 性能影响
- 破坏性变更
- 检查清单
