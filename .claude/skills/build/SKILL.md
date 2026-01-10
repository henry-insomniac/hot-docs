---
name: build
description: "辅助构建和打包配置，包括生产构建、优化等"
category: tools
priority: required
required_before: [test]
required_after: [deploy]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [tools, build, packaging, optimization]
---

# /build - 构建打包助手

## 描述
辅助构建和打包配置，确保构建流程稳定高效。

## 构建场景
- 开发构建（dev server）
- 生产构建（static HTML）
- 子路径部署（site.base）
- Docker 镜像构建

## 工作流程
1. 配置构建环境
2. 执行构建命令
3. 验证构建产物
4. 优化构建性能
5. 生成构建报告

## 输入示例
```
/build 执行生产构建
/build 配置子路径部署
/build 优化构建性能
/build 创建 Docker 镜像
```

## 构建检查清单
- [ ] 所有包构建成功
- [ ] 类型检查通过
- [ ] 产物完整性验证
- [ ] 资源路径正确

## 相关文件
- scripts/build.mjs
- Dockerfile
- .dockerignore
