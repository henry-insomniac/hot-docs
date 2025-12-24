---
name: security
description: "安全审计与加固，包括文件系统安全、插件安全、XSS 防护等"
category: quality
priority: required
required_before: []
required_after: [commit]
auto_trigger: false
hot_docs_specific: true
branch_required: false
tags: [quality, security, audit, plugin-security]
---

# /security - 安全审计专家

## 描述
安全审计与加固，包括文件系统安全、插件安全、XSS 防护等。

## 审计重点

### 1. 插件安全边界
- 文件系统访问限制
- 不可直接执行shell命令
- 运行时权限控制

### 2. 路径安全
- 路径遍历防护（../../../etc/passwd）
- 符号链接检查
- 路径规范化

### 3. XSS 防护
- Markdown 渲染输出转义
- 用户内容 sanitize
- CSP 头部配置

### 4. 依赖安全
- npm audit 漏洞扫描
- 及时更新依赖
- 避免引入已知漏洞包

### 5. 敏感信息
- .env 文件不提交
- 构建产物不包含密钥
- 日志不输出敏感信息

## 工作流程
1. 扫描潜在安全风险
2. 评估风险等级
3. 设计加固方案
4. 实施安全修复
5. 验证修复效果
6. 更新安全文档

## 输入示例
```
/security 审计 packages/core/src/content/scan.ts 的路径安全
/security 检查插件文件系统访问权限
/security 扫描依赖漏洞
```

## 安全清单

### ✅ 必须检查项
- [ ] PluginContext.fs 仅允许访问 contentDir
- [ ] 用户输入路径经过规范化和校验
- [ ] rehype-sanitize 防止恶意 HTML
- [ ] 构建产物不包含 .env
- [ ] 无 eval() / Function() 动态执行

### ⚠️ 建议加强项
- [ ] 插件签名验证（未来）
- [ ] 沙箱隔离（未来）
- [ ] 依赖子资源完整性（SRI）

## 常见安全问题

### 1. 路径遍历
```typescript
// ❌ 危险：未验证路径
function readFile(userPath: string) {
  return fs.readFileSync(userPath);
}
// 攻击：readFile('../../../../../../etc/passwd')

// ✅ 安全：路径校验
function readFile(userPath: string) {
  const normalized = path.normalize(userPath);
  const resolved = path.resolve(contentDir, normalized);

  if (!resolved.startsWith(contentDir)) {
    throw new Error('Path traversal detected');
  }

  return fs.readFileSync(resolved);
}
```

### 2. XSS 注入
```typescript
// ❌ 危险：直接输出 HTML
const html = markdown.toHTML(); // 未转义

// ✅ 安全：使用 sanitize
import { rehypeSanitize } from 'rehype-sanitize';
const html = unified()
  .use(rehypeSanitize)
  .processSync(markdown);
```

### 3. 命令注入
```typescript
// ❌ 危险：拼接用户输入
exec(`git log ${userInput}`);

// ✅ 安全：使用参数数组
execFile('git', ['log', userInput]);
```

## 依赖扫描

```bash
# 扫描漏洞
pnpm audit

# 修复可自动修复的漏洞
pnpm audit fix

# 检查过时依赖
pnpm outdated
```

## 相关文件
- packages/*/src/**/*.ts
- package.json

## 配合使用的 Skills
- `/review` - 代码审查时关注安全
- `/debug` - 修复安全问题
- `/docs` - 更新安全文档
