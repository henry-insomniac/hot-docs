# /commit - 规范化提交

## 描述
生成符合 Conventional Commits 规范的 Git 提交。

## 提交类型
```
feat      新功能
fix       Bug修复
docs      文档更新
style     代码格式
refactor  重构
perf      性能优化
test      测试
build     构建系统
ci        CI/CD配置
chore     其他
```

## 作用域（Hot Docs）
```
core          核心引擎
dev-server    开发服务器
runtime       前端运行时
cli           命令行工具
plugins       插件系统
themes        主题系统
```

## 工作流程
1. 分析 git diff（staged changes）
2. 识别变更类型和作用域
3. 生成规范化的提交信息
4. 关联 Issue/PR
5. 执行 git commit

## 输入示例
```
/commit 实现 ContentIndex 增量更新
/commit fix(dev-server) 修复 Windows 路径问题，closes #43
/commit --breaking 重构配置文件结构
```

## 提交格式
```
<type>(<scope>): <subject>

<body>

<footer>
```
