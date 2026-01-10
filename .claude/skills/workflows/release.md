# 版本发布工作流

## 适用场景
发布新版本（Patch/Minor/Major Release）

## 工作流程

### 1. 里程碑验收
```bash
/milestone 检查里程碑完成度
```
- 确认所有任务完成
- 识别未完成项
- 评估发布准备度

### 2. 生成变更日志
```bash
/changelog 生成版本变更日志
```
- 从提交历史提取变更
- 分类整理（Features/Fixes/Breaking）
- 补充人工编辑

### 3. 构建验证
```bash
/build 执行生产构建
```
- 清理旧产物
- 构建所有包
- 验证产物完整性

### 4. 版本发布
```bash
/release --minor  # 或 --patch/--major
```
- 更新版本号
- 创建 Git tag
- NPM 发布
- GitHub Release

### 5. 后续清理
- 创建下一版本 milestone
- 归档已完成 issues
- 更新文档站点

## 检查清单

- [ ] 里程碑完成度 100%（/milestone）
- [ ] 变更日志生成（/changelog）
- [ ] 构建验证通过（/build）
- [ ] 版本发布成功（/release）
- [ ] GitHub Release 创建
- [ ] 文档站点更新
- [ ] 发布公告

## 预期产出
- 更新的 CHANGELOG.md
- NPM 包发布
- GitHub Release
- Git tag
