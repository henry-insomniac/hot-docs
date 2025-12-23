# /commit - 规范化提交

## 描述
生成符合 Conventional Commits 规范的 Git 提交。

## ⚠️ 重要原则

**禁止在 main/master 分支提交代码！**

提交前检查：
1. ✅ 当前分支不是 main/master
2. ✅ 所有测试通过
3. ✅ 代码已通过 lint 检查

**如果在 main 分支：**
- 立即停止提交
- 切换到功能分支或创建新分支
- 使用 `/branch` 创建合适的分支

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
1. **【必需】** 检查当前分支（不能是 main）
2. 分析 git diff（staged changes）
3. 识别变更类型和作用域
4. 生成规范化的提交信息
5. 关联 Issue/PR
6. 执行 git commit

## 分支检查

提交前自动执行：
```bash
# 检查当前分支
current_branch=$(git branch --show-current)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "❌ 错误：禁止在 main/master 分支提交代码！"
  echo ""
  echo "请先创建功能分支："
  echo "  /branch 创建 [功能描述] 分支"
  exit 1
fi
```

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
