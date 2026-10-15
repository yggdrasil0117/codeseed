# CodeSeed · 码芽生产部署指南

本项目使用两个 Compose 服务：

- `web`：Next.js 生产服务，容器内监听 `0.0.0.0:3000`。
- `db`：MySQL 8.0，只有 Compose 内部网络可访问，不映射宿主机端口。

Compose 项目名固定为 `codeseed`，数据库使用项目专属命名卷。ECS 使用从 GitHub Actions Artifact 导入的 GHCR Web 镜像，不在服务器编译 Next.js，也不会因 Compose 启动再次拉取 GHCR。本文档只提供部署命令，不会连接或操作其他 Compose 项目。

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

- `WEB_PORT` 默认是 `18081`，如果已占用，修改 `.env.production` 中的 `WEB_PORT`。
- 不需要检查或开放宿主机 `3306`，本 Compose 不发布 MySQL 端口。
- 不要复用其他项目的 Compose 项目名、服务名、数据卷或数据库。
- 本项目不修改已有 Nginx 配置，不自动开放 `80/443`。

如果发现已有服务占用 `18081`，或需要修改防火墙/反向代理，请先人工确认后再决定，不要覆盖现有服务。

## 4. 安全组与防火墙检查

只允许安全组和防火墙放行已经确认的 Web 宿主机端口：

```bash
sudo ufw status verbose
sudo ss -ltnp
```

首次验收可只放行 `${WEB_PORT}`（默认 `18081`）。不要开放 `3306`，不要自动开放 `80/443`。如果未来使用 Nginx 或 HTTPS，应先单独评估现有服务器配置。

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

- `WEB_IMAGE`：导入 ECS 的 GHCR 镜像标签，默认是 `ghcr.io/yggdrasil0117/codeseed:latest`；也可以使用已导入的 `:sha-<commit>` 标签。
- `NEXT_PUBLIC_SITE_URL`：真实域名，或当前阶段的 `http://服务器公网IP:18081`。
- `MYSQL_PASSWORD`：随机生成的应用数据库密码。
- `MYSQL_ROOT_PASSWORD`：与应用密码不同的随机根密码。
- `WEB_PORT`：确认未被服务器其他进程占用。

生产默认值必须保持：

```dotenv
COMMENTS_PUBLIC=false
COMMENTS_TRUST_PROXY=false
```

数据库密码只通过运行时环境传入。`NEXT_PUBLIC_SITE_URL` 是公开配置，会在 GitHub Actions 构建阶段进入 `NEXT_PUBLIC_*` 产物；修改它后必须重新导出并上传新的镜像 Artifact。`.env.production` 不应上传到 Artifact，也不应提交到 Git。

## 7. 导出、下载、上传并导入 GHCR 镜像

### 7.1 手动运行导出 Workflow

在 GitHub 仓库的 Actions 页面手动运行 `Export GHCR Image for ECS`，输入需要部署的标签：

- 推荐使用不可变的 `sha-<commit>` 标签。
- 面试展示快速部署可以使用 `latest`，但需要确认该标签对应预期提交。
- Workflow 会拉取 `linux/amd64` 镜像，执行 gzip 压缩，生成 `.sha256` 校验文件，并上传 3 天保留的 Artifact。
- Artifact 不包含源代码、环境文件、数据库密码、SSH 私钥或其他凭据。

Workflow 会先检查 Runner 临时目录剩余空间，低于 4 GiB 时停止；同时输出压缩镜像大小。GitHub Actions Artifact 是否能存储该文件还受仓库/组织套餐的总 Artifact 配额约束，大镜像应在上传日志中确认大小和配额，不要将 Artifact 作为长期镜像仓库。

### 7.2 Windows 下载 Artifact

优先在 GitHub Actions 运行详情页下载 Artifact，解压后应得到：

```text
codeseed-<tag>-<commit>.tar.gz
codeseed-<tag>-<commit>.tar.gz.sha256
```

如果 Windows 已安装并登录 GitHub CLI，也可以下载：

```powershell
$artifactDir = 'D:\codeseed-artifacts'
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
gh run download <RUN_ID> --repo yggdrasil0117/codeseed --name codeseed-image-<TAG>-<COMMIT_SHA> --dir $artifactDir
```

在 Windows 上核对下载文件：

```powershell
Get-ChildItem $artifactDir
Get-FileHash (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz') -Algorithm SHA256
Get-Content (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz.sha256')
```

比较 SHA256 值后再上传。Artifact 下载目录和 SSH 配置不应包含数据库密码或私钥文件。

### 7.3 Windows 使用现有 SSH 配置上传 ECS

推荐使用现有 SSH config 中的 Host 别名，不在命令中复制私钥：

```powershell
scp -F "$env:USERPROFILE\.ssh\config" `
  (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz') `
  <SSH_HOST_ALIAS>:/opt/codeseed-transfer/

scp -F "$env:USERPROFILE\.ssh\config" `
  (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz.sha256') `
  <SSH_HOST_ALIAS>:/opt/codeseed-transfer/
```

如果 SSH config 没有别名，可使用现有私钥路径通过 `-i` 指定，但不要把私钥复制到项目、GitHub 或 Artifact。远程目标目录需由部署人员预先确认，不要覆盖其他项目目录。

### 7.4 ECS 导入镜像并启动 Compose

在 ECS 上先执行只读资源和现有服务检查，获得人工批准后再执行导入：

```bash
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
ss -ltnp
free -h
df -h
```

导入并核对镜像：

```bash
cd /opt/codeseed-transfer
sha256sum -c codeseed-<tag>-<commit>.tar.gz.sha256
docker load --input codeseed-<tag>-<commit>.tar.gz
docker image inspect ghcr.io/yggdrasil0117/codeseed:<tag> --format 'OS={{.Os}} ARCH={{.Architecture}} SIZE={{.Size}}'
```

然后在 CodeSeed Compose 目录配置 `.env.production`，确认 `WEB_IMAGE=ghcr.io/yggdrasil0117/codeseed:<tag>`、`WEB_PORT=18081`、`COMMENTS_PUBLIC=false`，再只读检查并启动：

```bash
docker compose --env-file .env.production -p codeseed config
docker compose --env-file .env.production -p codeseed up -d --pull never
```

`--pull never` 确保 Compose 使用已经 `docker load` 的本地镜像，不再次访问速度缓慢的 GHCR。`db` 首次初始化时，官方 MySQL 镜像会在专属数据库 `MYSQL_DATABASE` 中执行只读挂载的 `db/init.sql`；该 SQL 使用 `CREATE TABLE IF NOT EXISTS`，不执行 `DROP DATABASE` 或 `DROP TABLE`。后续重启不会重新删除或覆盖数据卷。

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
curl -I "http://127.0.0.1:${WEB_PORT:-18081}/"
curl -I "http://127.0.0.1:${WEB_PORT:-18081}/blog/"
curl -I "http://127.0.0.1:${WEB_PORT:-18081}/blog/programming-basics-what-is-programming/"
curl -I "http://127.0.0.1:${WEB_PORT:-18081}/search.json"
curl -i "http://127.0.0.1:${WEB_PORT:-18081}/api/articles/programming-basics-what-is-programming/comments?page=1&limit=20"
```

首次部署默认 `COMMENTS_PUBLIC=false`，POST 应返回 `503 comments_disabled`。不要为了验证而在公网开启匿名评论。

公开 GET 评论接口只会返回 `approved` 状态。当前项目没有公开审核接口，评论审核需要受控 SQL 或未来的管理流程；生产环境不要向公网暴露审核凭据。

## 10. 数据库持久化验证

确认 Compose 卷名称和状态：

```bash
docker volume ls --filter name=codeseed
docker compose --env-file .env.production -p codeseed ps -a
```

如果在受控测试中已经有评论数据，可以只更新已导入的 Web 镜像验证数据库仍可访问：

```bash
docker compose --env-file .env.production -p codeseed up -d --no-deps --pull never web
```

不要使用 `docker compose down -v`。不要删除 `codeseed` 数据卷。数据库卷是独立持久化边界，Web 镜像重建不会删除它。

## 11. 安全更新方法

修改应用代码或依赖后，重新运行导出 Workflow，下载新的 Artifact 并执行 `docker load`；ECS 只使用本地导入镜像更新 Web 服务：

```bash
docker load --input /opt/codeseed-transfer/codeseed-<tag>-<commit>.tar.gz
docker compose --env-file .env.production -p codeseed up -d --no-deps --pull never web
```

MySQL 镜像升级前先完成备份、兼容性评估和人工确认。不要在没有备份的情况下替换数据库卷。生产环境匿名评论仍应保持关闭，除非已经确认 HTTPS、反向代理头、单实例限流和滥用防护策略。

## 12. 回滚方法

应用回滚应使用已经导入并验证过的旧 GHCR 镜像标签：

```bash
vi .env.production  # 将 WEB_IMAGE 改为已导入的 ghcr.io/...:sha-<commit> 或旧版本标签
docker compose --env-file .env.production -p codeseed up -d --no-deps --pull never web
```

不要回滚或删除数据库卷来处理 Web 代码问题。数据库 schema 变更需要单独的向后兼容迁移方案；当前 `db/init.sql` 只负责首次建表。

## 13. 常见故障排查

### `web` 没有启动

```bash
docker compose --env-file .env.production -p codeseed ps
docker compose --env-file .env.production -p codeseed logs web
```

检查 `WEB_IMAGE` 是否与 `docker image ls` 中已经导入的 GHCR 标签完全一致，并确认 `docker load` 没有报错。

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

`NEXT_PUBLIC_SITE_URL` 在 GitHub Actions 构建镜像阶段生效。修改域名/IP 后需要更新 GitHub Variable 并重新触发镜像构建；不要只重启 ECS 容器。

### 端口冲突

修改 `.env.production` 中的 `WEB_PORT`，然后重新执行 Compose 配置检查。不要停止或修改占用该端口的其他项目，除非服务器管理员明确批准。

## 14. 当前阶段限制

本仓库的部署配置在当前 Windows 环境完成静态检查，但本机 Docker CLI 不可用，因此尚未执行镜像导出 Workflow、Artifact 下载、SCP 上传、ECS `docker load`、Compose 启动、MySQL 健康检查、容器内服务名解析或重启持久化测试。部署到 Ubuntu 前必须按本文档逐项验证。
