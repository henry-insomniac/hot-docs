# /deploy - 部署配置助手

## 描述
辅助部署配置和执行，支持多种部署目标。

## 部署目标
- GitHub Pages（静态托管）
- Vercel/Netlify（边缘部署）
- 对象存储 + CDN（阿里云 OSS/腾讯云 COS）
- Docker + Nginx（容器部署）

## 工作流程
1. 选择部署目标
2. 配置部署参数
3. 生成部署配置
4. 执行部署命令
5. 验证部署结果

## 输入示例
```
/deploy 配置 GitHub Pages 部署
/deploy 生成 Vercel 配置
/deploy 创建 Docker 部署方案
```

## 部署配置

### GitHub Actions
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
      - uses: peaceiris/actions-gh-pages@v3
```

### Dockerfile
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
EXPOSE 5173
CMD ["pnpm", "preview"]
```

## 相关文件
- .github/workflows/
- Dockerfile
- vercel.json
- netlify.toml
