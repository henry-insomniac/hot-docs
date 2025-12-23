# /plugin - 插件开发专家

## 描述
辅助开发 Hot Docs 插件，包括官方示例插件和第三方插件开发指导。这是 Hot Docs 特有的 Skill。

## 适用场景
- 官方示例插件（search/mermaid/feed/sitemap）
- 第三方插件开发指导
- 插件调试与诊断
- 插件性能优化

## 插件类型

### 1. content 插件
扩展 Markdown/MDX 内容能力

### 2. site 插件
扩展站点能力（导航、搜索、路由）

### 3. dev 插件
扩展开发期能力（watch、overlay、诊断）

### 4. deploy 插件
扩展部署能力（redirects、headers）

## 工作流程
1. 确认插件类型（content/site/dev/deploy）
2. 设计 manifest（capabilities 声明）
3. 编写插件入口（工厂函数）
4. 实现分阶段 hooks
5. 添加错误处理与性能埋点
6. 编写插件文档与示例

## 插件模板

### 基础插件结构
```typescript
// @hot-docs/plugin-example
export default function plugin(options = {}) {
  return {
    name: '@hot-docs/plugin-example',
    capabilities: ['render', 'client'],

    // Node 侧：扩展 Markdown 渲染
    remarkPlugins: [
      // remark 插件
    ],

    rehypePlugins: [
      // rehype 插件
    ],

    // Browser 侧：客户端增强
    client: {
      components: [],
      enhanceApp() {
        // 注入全局样式或脚本
      }
    },

    // Dev 侧：文件变更处理
    async onFileChanged(ctx) {
      // 增量更新逻辑
      return { type: 'skip' };
    }
  };
}
```

### Mermaid 插件示例
```typescript
// @hot-docs/plugin-mermaid
import { visit } from 'unist-util-visit';

export default function mermaidPlugin(options = {}) {
  return {
    name: '@hot-docs/plugin-mermaid',
    capabilities: ['render', 'client'],

    // 渲染时处理 mermaid 代码块
    rehypePlugins: [
      function rehypeMermaid() {
        return (tree) => {
          visit(tree, 'element', (node) => {
            if (node.tagName === 'code' &&
                node.properties.className?.includes('language-mermaid')) {
              // 转换为 mermaid 容器
              node.tagName = 'div';
              node.properties.className = ['mermaid'];
            }
          });
        };
      }
    ],

    // 客户端加载 mermaid 库
    client: {
      enhanceApp() {
        if (typeof window !== 'undefined') {
          import('mermaid').then(({ default: mermaid }) => {
            mermaid.initialize({ theme: 'dark' });
            mermaid.init();
          });
        }
      }
    }
  };
}
```

## 输入示例
```
/plugin 创建一个 Mermaid 图表支持插件
/plugin 创建一个本地搜索插件
/plugin 调试插件加载失败问题
```

## 插件开发最佳实践

### ✅ 好的插件特征
- 职责单一（一个插件解决一个问题）
- 性能友好（hook 执行 < 50ms）
- 错误处理完善（不影响整体构建）
- 文档清晰（使用示例、配置说明）

### ❌ 避免的陷阱
- 直接访问文件系统（应通过 ctx.fs）
- 阻塞主线程（耗时操作应异步）
- 修改全局状态（避免副作用）
- 缺少能力声明（capabilities 必须完整）

## 相关文件
- packages/plugin-*/（插件实现）
- docs/plugin-development.md（插件开发文档）

## 配合使用的 Skills
- `/implement` - 实现插件逻辑
- `/test` - 编写插件测试
- `/docs` - 编写插件文档
