# CodeSeed · 码芽生产部署指南

本项目使用两个 Compose 服务：

- `web`：Next.js 生产服务，容器内监听 `0.0.0.0:3000`。
- `db`：MySQL 8.0，只有 Compose 内部网络可访问，不映射宿主机端口。

Compose 项目名固定为 `codeseed`，数据库使用项目专属命名卷。本文档只提供部署命令，不会连接或操作其他 Compose 项目。

## 1. 本地环境准备

需要准备：

- Git
- Docker Engine 和 Docker Compose v2（`docker compose` 命令）
- 可用的 Linux/Ubuntu 部署主机

在项目根目录确认关键文件存在：

```bash
test -f Dockerfile
test -f compose.yaml
test -f db/init.sql
test -f .env.production.example
```

本项目当前使用 Yarn 3.6.1 和 `nodeLinker: node-modules`。Docker 构建会依据 `yarn.lock` 和 `.yarn/releases/yarn-3.6.1.cjs` 安装依赖。

## 2. Ubuntu 服务器 Docker 检查

先只做检查，不要使用 `docker system prune`、`docker compose down -v` 或不明范围的删除命令：

```bash
docker version
docker compose version
docker info
```

如果 Docker 不可用，先修复 Docker 安装或权限问题，再继续部署。不要通过删除现有容器、镜像或数据卷来排查。

## 3. 检查现有容器和端口

部署前记录服务器现状，确认候选端口没有被其他服务占用：

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
ss -ltnp
```

重点检查：

- `WEB_PORT` 默认是 `18080`，如果已占用，修改 `.env.production` 中的 `WEB_PORT`。
- 不需要检查或开放宿主机 `3306`，本 Compose 不发布 MySQL 端口。
- 不要复用其他项目的 Compose 项目名、服务名、数据卷或数据库。
- 本项目不修改已有 Nginx 配置，不自动开放 `80/443`。

如果发现已有服务占用 `18080`，或需要修改防火墙/反向代理，请先人工确认后再决定，不要覆盖现有服务。

## 4. 安全组与防火墙检查

只允许安全组和防火墙放行已经确认的 Web 宿主机端口：

```bash
sudo ufw status verbose
sudo ss -ltnp
```

首次验收可只放行 `${WEB_PORT}`（默认 `18080`）。不要开放 `3306`，不要自动开放 `80/443`。如果未来使用 Nginx 或 HTTPS，应先单独评估现有服务器配置。

## 5. 上传项目或 Git 拉取

可以使用受控目录上传，或从受信任的 Git 仓库拉取：

```bash
sudo mkdir -p /opt/codeseed
sudo chown "$USER":"$USER" /opt/codeseed
cd /opt/codeseed
git clone <REPOSITORY_URL> .
```

如果目录已有项目，先确认 `git status` 和远程地址，避免覆盖其他应用。不要把 `.env.production`、SSH 私钥或其他项目文件放入仓库。

## 6. 配置生产环境变量

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

编辑 `.env.production`，至少替换：

- `NEXT_PUBLIC_SITE_URL`：真实域名，或当前阶段的 `http://服务器公网IP:18080`。
- `MYSQL_PASSWORD`：随机生成的应用数据库密码。
- `MYSQL_ROOT_PASSWORD`：与应用密码不同的随机根密码。
- `WEB_PORT`：确认未被服务器其他进程占用。

生产默认值必须保持：

```dotenv
COMMENTS_PUBLIC=false
COMMENTS_TRUST_PROXY=false
```

数据库密码只通过运行时环境传入。`NEXT_PUBLIC_SITE_URL` 是公开配置，会在构建阶段进入 `NEXT_PUBLIC_*` 产物；修改它后必须重新构建 Web 镜像。`.env.production` 被 `.dockerignore` 排除，不会进入构建上下文。

## 7. 构建与启动 Compose

先检查 Compose 最终配置，只读，不启动服务：

```bash
docker compose --env-file .env.production -p codeseed config
```

确认服务只有 `web` 和 `db`、没有 `ports` 下的 MySQL 映射后，再构建启动：

```bash
docker compose --env-file .env.production -p codeseed build web
docker compose --env-file .env.production -p codeseed up -d
```

`db` 首次初始化时，官方 MySQL 镜像会在专属数据库 `MYSQL_DATABASE` 中执行只读挂载的 `db/init.sql`。该 SQL 使用 `CREATE TABLE IF NOT EXISTS`，不执行 `DROP DATABASE` 或 `DROP TABLE`。

初始化完成后，Compose 会等待 `db` 健康检查通过，再启动 `web`。后续重启不会重新执行初始化脚本，也不会覆盖现有数据卷。

## 8. 容器状态与日志检查

```bash
docker compose --env-file .env.production -p codeseed ps
docker compose --env-file .env.production -p codeseed logs --tail=100 db
docker compose --env-file .env.production -p codeseed logs --tail=100 web
```

预期状态：

- `db` 为 `healthy`。
- `web` 为 `running`。
- `db` 没有宿主机端口映射。
- `web` 映射为 `${WEB_PORT}:3000`。

如果数据库连接失败，先查看日志和环境变量，再检查 Compose 内部服务名是否为 `db`。不要反复删除容器或数据卷。

## 9. 首次功能验证

将 `WEB_PORT` 替换为实际值：

```bash
curl -I "http://127.0.0.1:${WEB_PORT:-18080}/"
curl -I "http://127.0.0.1:${WEB_PORT:-18080}/blog/"
curl -I "http://127.0.0.1:${WEB_PORT:-18080}/blog/programming-basics-what-is-programming/"
curl -I "http://127.0.0.1:${WEB_PORT:-18080}/search.json"
curl -i "http://127.0.0.1:${WEB_PORT:-18080}/api/articles/programming-basics-what-is-programming/comments?page=1&limit=20"
```

首次部署默认 `COMMENTS_PUBLIC=false`，POST 应返回 `503 comments_disabled`。不要为了验证而在公网开启匿名评论。

公开 GET 评论接口只会返回 `approved` 状态。当前项目没有公开审核接口，评论审核需要受控 SQL 或未来的管理流程；生产环境不要向公网暴露审核凭据。

## 10. 数据库持久化验证

确认 Compose 卷名称和状态：

```bash
docker volume ls --filter name=codeseed
docker compose --env-file .env.production -p codeseed ps -a
```

如果在受控测试中已经有评论数据，可以只重建 Web 服务验证数据库仍可访问：

```bash
docker compose --env-file .env.production -p codeseed up -d --build web
```

不要使用 `docker compose down -v`。不要删除 `codeseed` 数据卷。数据库卷是独立持久化边界，Web 镜像重建不会删除它。

## 11. 安全更新方法

修改应用代码或依赖后，只重建并重新创建本项目的 Web 服务：

```bash
docker compose --env-file .env.production -p codeseed build web
docker compose --env-file .env.production -p codeseed up -d --no-deps web
```

MySQL 镜像升级前先完成备份、兼容性评估和人工确认。不要在没有备份的情况下替换数据库卷。生产环境匿名评论仍应保持关闭，除非已经确认 HTTPS、反向代理头、单实例限流和滥用防护策略。

## 12. 回滚方法

应用回滚应使用已验证的 Git 提交或旧镜像标签：

```bash
git fetch --tags
git checkout <VERIFIED_COMMIT_OR_TAG>
docker compose --env-file .env.production -p codeseed build web
docker compose --env-file .env.production -p codeseed up -d --no-deps web
```

不要回滚或删除数据库卷来处理 Web 代码问题。数据库 schema 变更需要单独的向后兼容迁移方案；当前 `db/init.sql` 只负责首次建表。

## 13. 常见故障排查

### `web` 没有启动

```bash
docker compose --env-file .env.production -p codeseed ps
docker compose --env-file .env.production -p codeseed logs web
```

检查构建阶段的 `NEXT_PUBLIC_SITE_URL` 是否已设置，以及 Node/Next 构建是否成功。

### `db` 一直不是 healthy

```bash
docker compose --env-file .env.production -p codeseed logs db
docker inspect "$(docker compose --env-file .env.production -p codeseed ps -q db)" --format '{{json .State.Health}}'
```

检查 root/app 密码、卷权限和宿主机资源。首次 MySQL 初始化可能需要更长时间，但不要因此删除数据卷。

### 评论 API 返回 `503 comments_unavailable`

确认 Web 容器内的 `MYSQL_HOST=db`、`MYSQL_PORT=3306`、数据库名、用户和密码与 MySQL 初始化变量一致：

```bash
docker compose --env-file .env.production -p codeseed exec web printenv MYSQL_HOST MYSQL_PORT MYSQL_DATABASE MYSQL_USER
```

不要打印 `MYSQL_PASSWORD` 或 `MYSQL_ROOT_PASSWORD`。检查 `db` 日志和 Web 日志，不要把数据库密码写入问题报告或聊天记录。

### 页面可访问但 URL 或 SEO 不正确

`NEXT_PUBLIC_SITE_URL` 在构建阶段生效。修改域名/IP 后执行 Web 镜像重建；不要只重启容器。

### 端口冲突

修改 `.env.production` 中的 `WEB_PORT`，然后重新执行 Compose 配置检查。不要停止或修改占用该端口的其他项目，除非服务器管理员明确批准。

## 14. 当前阶段限制

本仓库的部署配置在当前 Windows 环境完成静态检查，但本机 Docker CLI 不可用，因此尚未执行 Docker 镜像构建、Compose 启动、MySQL 健康检查、容器内服务名解析或重启持久化测试。部署到 Ubuntu 前必须按本文档逐项验证。
