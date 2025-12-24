# 插件开发工作流

## 适用场景
开发 Hot Docs 插件（Mermaid/搜索/Feed/Sitemap）

## 工作流程

### 1. 插件设计
```bash
/plugin 设计插件架构
```
- 确定插件类型（content/site/dev/deploy）
- 设计 manifest（capabilities 声明）
- 设计 hook 实现

### 2. 插件实现
```bash
/plugin 创建插件骨架并实现核心逻辑
```
- 编写插件入口
- 实现分阶段 hooks
- 添加错误处理

### 3. 测试编写
```bash
/test 编写插件测试
```
- 单元测试（hook 逻辑）
- 集成测试（插件加载）
- 性能测试（hook 执行时间）

### 4. 文档编写
```bash
/docs 编写插件文档
```
- 使用说明
- 配置选项
- API 参考
- 示例代码

### 5. 代码提交
```bash
/commit 提交插件代码
```
- 格式：`feat(plugins): add @hot-docs/plugin-xxx`

### 6. 创建 PR
```bash
/pr 创建插件 PR
```
- 说明插件功能
- 提供使用示例
- 说明性能影响

## 检查清单

- [ ] 插件设计完成（/plugin）
- [ ] 核心功能实现
- [ ] 测试覆盖充分（/test）
- [ ] 文档完整（/docs）
- [ ] 提交信息规范（/commit）
- [ ] PR 创建（/pr）
- [ ] 性能测试通过

## 预期产出
- 插件代码
- 测试用例
- 插件文档
- Pull Request
