# Hot Docs Skills 可视化流程图

本目录包含 Hot Docs 项目的所有工作流程和架构可视化图表，使用 Graphviz DOT 语言编写。

## 📊 图表列表

### 工作流程图

1. **new-feature-workflow.dot** - 新功能开发完整流程
   - 从需求分析到 PR 合并的完整链路
   - 包含分支保护、测试、审查等强制步骤

2. **bug-fix-workflow.dot** - Bug 修复流程 (TDD 驱动)
   - 体现 TDD 三步法：RED → GREEN → REFACTOR
   - 强调测试先行，确保 Bug 不再复现

3. **plugin-dev-workflow.dot** - Hot Docs 插件开发流程
   - 插件架构设计、安全边界检查
   - Hot Docs 特有的插件规范和约束

4. **refactor-workflow.dot** - 代码重构流程 (测试保护)
   - 测试保护的重构策略
   - 基准对比和架构合规性审查

5. **theme-dev-workflow.dot** - Hot Docs 主题开发流程
   - 主题设计、可访问性、性能优化
   - Hot Docs 主题规范和 Design Tokens

6. **perf-optimization-workflow.dot** - 性能优化流程
   - 性能分析、瓶颈定位、优化实施
   - Hot Docs 性能目标和验证方法

7. **release-workflow.dot** - 版本发布流程
   - 里程碑检查、变更日志、构建测试
   - 完整的发布清单和 npm 发布

### 架构图

8. **hot-docs-architecture.dot** - Hot Docs 五层架构
   - Foundation → Core → Adapters → Runtime → Ecosystem
   - 架构原则和依赖规则

9. **skill-dependencies.dot** - Skills 依赖关系图
   - 29 个 Skills 的依赖关系网络
   - 强制流程、推荐流程、可选流程的可视化

## 🔧 渲染图表

### 安装 Graphviz

```bash
# macOS
brew install graphviz

# Ubuntu/Debian
sudo apt-get install graphviz

# Windows (使用 Chocolatey)
choco install graphviz

# 或从官网下载：https://graphviz.org/download/
```

### 渲染单个图表

```bash
# 渲染为 PNG
dot -Tpng new-feature-workflow.dot -o new-feature-workflow.png

# 渲染为 SVG (推荐，矢量格式)
dot -Tsvg new-feature-workflow.dot -o new-feature-workflow.svg

# 渲染为 PDF
dot -Tpdf new-feature-workflow.dot -o new-feature-workflow.pdf
```

### 批量渲染所有图表

使用提供的渲染脚本：

```bash
# 渲染所有 .dot 文件为 PNG
./render-all.sh png

# 渲染所有 .dot 文件为 SVG
./render-all.sh svg

# 渲染所有 .dot 文件为 PDF
./render-all.sh pdf
```

或者手动批量渲染：

```bash
# 批量渲染为 PNG
for file in *.dot; do
  dot -Tpng "$file" -o "${file%.dot}.png"
done

# 批量渲染为 SVG
for file in *.dot; do
  dot -Tsvg "$file" -o "${file%.dot}.svg"
done
```

## 📝 DOT 语言基础

### 节点定义

```dot
node_id [label="显示文本", shape=box, fillcolor=lightblue, penwidth=2];
```

常用形状：
- `box` - 方框（默认）
- `ellipse` - 椭圆
- `diamond` - 菱形（决策点）
- `note` - 笔记
- `plaintext` - 纯文本

### 边（连接）定义

```dot
node1 -> node2 [label="关系", color=red, penwidth=2];
```

边属性：
- `label` - 边上的文字
- `color` - 边的颜色
- `penwidth` - 边的粗细
- `style` - 样式（solid/dashed/dotted）

### 子图（分组）

```dot
subgraph cluster_name {
    label="分组名称";
    style=filled;
    fillcolor=lightgray;

    node1;
    node2;
}
```

## 🎨 配色方案

Hot Docs Skills 图表使用统一的配色方案：

| 颜色 | 用途 | 示例 |
|------|------|------|
| 红色 (red) | 强制流程、警告 | 分支保护、必须执行 |
| 绿色 (green) | 成功、通过 | 测试通过、审查通过 |
| 蓝色 (#0066cc) | 推荐流程 | TDD、架构合规 |
| 橙色 (orange) | 可选流程 | 文档、性能优化 |
| 黄色 (yellow) | 重要节点 | 关键步骤 |
| 灰色 (gray) | 辅助流程 | 分析、工具 |

背景色：
- `#e6f7ff` - 浅蓝（规划类）
- `#f0ffe6` - 浅绿（管理类）
- `#fff7e6` - 浅黄（开发类）
- `#ffe6f0` - 浅粉（质量类）
- `#f0e6ff` - 浅紫（文档类）
- `#ffe6e6` - 浅红（版本控制类）
- `#f0f0f0` - 浅灰（工具类）

## 🔍 在线预览工具

如果不想安装 Graphviz，可以使用在线工具：

1. **Graphviz Online**: https://dreampuf.github.io/GraphvizOnline/
2. **Edotor**: https://edotor.net/
3. **SketchViz**: https://sketchviz.com/

复制 `.dot` 文件内容到这些网站即可预览。

## 📚 参考资料

- [Graphviz 官方文档](https://graphviz.org/documentation/)
- [DOT 语言指南](https://graphviz.org/doc/info/lang.html)
- [节点形状参考](https://graphviz.org/doc/info/shapes.html)
- [颜色名称参考](https://graphviz.org/doc/info/colors.html)

## 🤝 贡献

如果发现流程图有错误或需要添加新的工作流程图，请：

1. 修改或创建相应的 `.dot` 文件
2. 确保遵循现有的配色方案和命名约定
3. 渲染图表验证正确性
4. 更新本 README 文件
5. 提交 PR

## 📄 许可

这些图表是 Hot Docs 项目的一部分，遵循项目的许可协议。
