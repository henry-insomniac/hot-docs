---
name: release
description: "完整的版本发布流程管理，包括打tag、发布notes等"
category: versioning
priority: required
required_before: [milestone, build, test]
required_after: [changelog]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [versioning, release, publish, semver]
---

# /release - 版本发布助手

## 描述
完整的版本发布流程管理，包括版本号更新、构建、发布。

## 发布类型
- Patch Release（补丁版本）- Bug 修复
- Minor Release（次版本）- 新功能
- Major Release（主版本）- 破坏性变更

## 工作流程
1. 检查发布前提条件
2. 确定版本号（SemVer）
3. 更新版本号（package.json/CHANGELOG）
4. 构建与验证
5. Git 操作（commit/tag/push）
6. NPM 发布
7. GitHub Release
8. 后续清理

## 输入示例
```
/release              # 交互式选择
/release --patch      # 补丁版本
/release --minor      # 次版本
/release --major      # 主版本
/release --prerelease alpha  # 预发布
/release --dry-run    # 模拟发布
```

## 发布清单
- [ ] 所有测试通过
- [ ] 构建成功
- [ ] 版本号更新
- [ ] CHANGELOG 更新
- [ ] Git tag 创建
- [ ] NPM 发布
- [ ] GitHub Release
