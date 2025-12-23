# /branch - 分支创建与管理

## 描述
智能创建和管理 Git 分支，遵循分支命名规范。

## 分支命名规范
```
feature/<scope>/<brief-description>    # 新功能
fix/<scope>/<issue-number>-<description>  # Bug修复
hotfix/<version>-<description>         # 紧急修复
refactor/<scope>/<description>         # 重构
docs/<description>                     # 文档更新
chore/<description>                    # 工程配置
```

## 工作流程
1. 分析需求，确定分支类型和作用域
2. 检查当前分支状态
3. 同步最新主分支
4. 创建符合规范的分支名
5. 推送到远程（可选）

## 输入示例
```
/branch 创建增量索引功能分支
/branch 基于 Issue #42 创建分支
/branch list  # 列出所有分支
/branch clean # 清理已合并分支
```

## 相关命令
```bash
git checkout -b feature/core/incremental-index
git push -u origin feature/core/incremental-index
```
