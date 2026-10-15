# CodeSeed · 码芽 Stage 4.3 交接文档

## 1. 本阶段完成内容

- 新增多阶段 `Dockerfile`，使用 Node.js 22、项目内 Yarn 3.6.1 和 `node_modules` linker。
- 构建阶段执行 Next.js、Contentlayer/MDX 编译和现有 RSS postbuild。
- 运行阶段使用非 root `nextjs` 用户执行 `next start`，监听 `0.0.0.0:3000`，保留动态评论 API。
- 新增 `compose.yaml`，只包含 `web` 和 `db` 两个 CodeSeed 服务。
- MySQL 使用 `mysql:8.0.44`、项目专属命名卷和内部网络，不映射宿主机 3306。
- 新增 `.dockerignore`，排除本地依赖、构建产物、环境文件、密钥和临时数据目录。
- 新增 `.env.production.example`，不包含真实密码，默认关闭匿名评论和代理头信任。
- 新增 `docs/deployment.md`，记录 Ubuntu 检查、部署、验证、持久化、安全更新、回滚和故障排查流程。

本阶段没有修改页面、文章、评论业务、Contentlayer 数据模型或服务器配置。

## 2. 部署架构

```text
公网 :WEB_PORT (默认 18080)
          |
          v
    web:3000 (Next.js)
          |
          | codeseed-internal network
          v
    db:3306 (MySQL 8)
          |
          v
    codeseed_mysql_data volume
```

`db` 没有 `ports` 映射，只能通过 Compose 内部服务名 `db:3306` 访问。Compose 顶层项目名为 `codeseed`，没有设置固定 `container_name`，不会主动覆盖其他项目的容器命名。

## 3. 配置要点

- `NEXT_PUBLIC_SITE_URL` 通过 Compose build arg 在构建阶段注入；修改后需要重新构建 Web 镜像。
- MySQL 初始化使用现有 `db/init.sql` 的 `CREATE TABLE IF NOT EXISTS`，没有 `DROP DATABASE` 或 `DROP TABLE`。
- MySQL 官方镜像只在首次创建空数据卷时执行 `/docker-entrypoint-initdb.d/001-codeseed-init.sql`。
- Web 启动依赖 `db` 健康检查通过。
- `COMMENTS_PUBLIC=false`、`COMMENTS_TRUST_PROXY=false` 是生产模板默认值。
- Web 使用 `MYSQL_HOST=db`，数据库凭据仅通过运行时环境注入，不写入镜像和 Git。
- 内存限流仍然只是单实例应用层防护，不作为公网多实例安全边界。

## 4. 验证结果

### 已完成

- 阅读并核对 `docs/handoff-stage3.5.md`、`docs/handoff-stage4.1.md`、`docs/handoff-stage4.2.md`、`package.json`、`next.config.js`、`db/init.sql`、`lib/db.ts` 和 `.env.example`。
- 检查项目 Yarn 3.6.1、`nodeLinker: node-modules` 和当前 Next 配置。
- 检查 Dockerfile、Compose、环境模板和 `.dockerignore` 的内容逻辑。
- 现有项目生产构建：此前已使用 Windows PowerShell 兼容方式通过 `corepack yarn next build`，并生成 RSS。
- 运行本阶段静态收尾检查：`git diff --check` 通过。

### 未执行

当前本机 Docker CLI 不可用（检查结果：`docker-cli=unavailable`），因此没有执行：

- Docker 镜像构建。
- `docker compose config`、容器启动和健康检查。
- Compose 内部 `db` 服务名解析与 Web 到 MySQL 的容器网络连接。
- 容器重启后的数据库卷持久化测试。

这些项目必须在 Ubuntu Docker 主机上按 `docs/deployment.md` 实际验证；本阶段没有宣称 Docker 联调通过。

## 5. 风险与人工确认项

- 服务器端口 `18080` 可能被已有服务占用，部署前必须执行端口检查；不得自动停止其他服务。
- `.env.production` 必须由部署人员创建并设置强密码，不要提交到 Git。
- 当前 Next 配置没有启用 `output: 'standalone'`，因此 Dockerfile 采用 `next start` 并复制构建所需的 `node_modules`，镜像体积会大于 standalone 方案，但与当前真实配置一致。
- Docker 构建阶段需要访问依赖缓存/包源；网络、代理或 Yarn 缓存问题应在构建日志中定位，不要删除数据库卷。
- 生产环境默认关闭匿名评论；即使开启，当前内存限流也只适用于单 Web 实例，不能替代网关/WAF 或共享限流。
- 未修改服务器已有 Nginx、云安全组、防火墙或其他 Compose 项目。

## 6. 下一步建议

1. 在 Ubuntu 主机先执行文档中的 Docker、容器和端口检查，等待人工确认端口和安全组。
2. 创建权限为 `600` 的 `.env.production`，设置真实域名/IP和随机数据库密码。
3. 先执行 `docker compose ... config`，确认只有 `web`、`db`，且没有 MySQL 公网端口映射。
4. 构建并启动后验证首页、文章、搜索、评论 GET、评论关闭状态和日志。
5. 只在完成 HTTPS、代理头和滥用防护评估后，再讨论是否启用 `COMMENTS_PUBLIC=true`。
