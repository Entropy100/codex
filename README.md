# Entropy Cloud v2

面向个人使用的 Cloudflare 管理面板。Dashboard（React/Vite）只调用同源或独立部署的 Entropy API；Worker（Hono）持有 Cloudflare API Token，并通过 D1、KV、R2 bindings 管理数据和文件。

## 架构与目录

```text
apps/dashboard  React + Vite 中文控制台
apps/api        Hono Cloudflare Worker、路由、服务、迁移
packages/shared 前后端 API 类型
```

API 路由包括 health、overview、Workers、Pages、D1、KV、R2 与审计日志。写入 KV、上传/删除 R2 和删除 Worker 都写入 `operation_logs`。KV/R2 操作使用绑定的个人 namespace/bucket；Cloudflare API 列表使用受限 Token。Workers 的删除直接代理 Cloudflare API。

## 安装与本地开发

```bash
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm db:migrate:local
pnpm dev
# 或 pnpm dev:dashboard / pnpm dev:api
pnpm typecheck
pnpm build
```

Dashboard 默认使用 `http://localhost:8787`；用根目录 `.env` 的 `VITE_API_ORIGIN` 覆盖。不要将 `.dev.vars`、`.env` 或 Token 提交到 Git。

## Cloudflare 配置与部署

1. `wrangler login`，创建一个 D1 数据库、一个 KV namespace 和一个 R2 bucket（建议为 `entropy-cloud`、`entropy-cloud-kv`、`entropy-cloud-files`）。
2. 将真实 D1 database ID 与 KV namespace ID 填入 `apps/api/wrangler.jsonc`（该文件的占位符不能直接部署）。R2 bucket 名必须和实际 bucket 一致。
3. 设置 Worker secrets：
   ```bash
   cd apps/api
   wrangler secret put CLOUDFLARE_API_TOKEN
   wrangler secret put CLOUDFLARE_ACCOUNT_ID
   wrangler d1 migrations apply entropy-cloud --remote
   wrangler deploy
   ```
   Token 只需赋予要使用的 Workers、Pages、D1、KV 权限；不要使用全局 API key。`DASHBOARD_ORIGIN` 是非秘密变量，必须改成正式 Dashboard HTTPS origin。
4. 运行 `pnpm --filter @entropy/dashboard build`，把 `apps/dashboard/dist` 用 Pages Git 构建（命令 `pnpm --filter @entropy/dashboard build`，输出目录 `apps/dashboard/dist`）或 `wrangler pages deploy apps/dashboard/dist` 发布。为 Dashboard 设置 `VITE_API_ORIGIN=https://api.example.com` 后重新构建。
5. 为 API Worker 和 Pages 分别绑定自定义域名；在 Cloudflare Zero Trust 为 Dashboard 域名建立 Access Application/Policy。API CORS 仅允许 `DASHBOARD_ORIGIN`，不使用通配符。

## 数据与安全

迁移创建 `settings`、`managed_resources`、`operation_logs`、`file_objects` 及查询索引。业务表不存储秘密。所有浏览器的敏感请求都经由 Worker；前端 bundle、localStorage 与仓库均不含 Cloudflare Token。生产环境应由 Cloudflare Access 在 Dashboard/API 前进行身份认证；本 Worker 不自行伪造登录系统。

## 质量命令

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## 当前能力边界

Cloudflare API 已提供真实的列表与 Worker 删除路径；脚本多部件上传、Pages 项目删除/部署以及 D1 schema 读取需要按账户权限和上传工件工作流扩展，界面不会将它们伪装成可执行操作。R2 与绑定 KV 的 CRUD 均可用。`
