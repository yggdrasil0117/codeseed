# CodeSeed · 码芽 Stage 4.5 交接文档

## 1. 已完成操作

- 检查了本地 Git 状态和远程地址：`origin` 为 `https://github.com/yggdrasil0117/codeseed.git`，同时保留原项目 `upstream`。
- 检查了现有 GitHub Actions、Dockerfile、Compose、生产环境模板和部署文档。
- 确认现有 workflow 已支持 GHCR 的 `latest` 和 `sha-<commit>` 镜像标签、`linux/amd64` 构建和 `NEXT_PUBLIC_SITE_URL` 构建参数。
- 调整 `.github/workflows/docker.yml`：保留 GHCR 推送；当 ACR Variables/Secrets 配置完整时，同一次 Buildx 构建同时推送 ACR 的 `latest` 和 `sha-<commit>` 标签。
- ACR 配置不完整时，workflow 明确输出 warning 并继续 GHCR；只配置了一部分时，workflow 输出缺失项并失败，不会进行不完整的 ACR 登录。
- 调整 `compose.yaml`：改为使用预构建的 `${WEB_IMAGE}`，默认 Web 端口切换为 `18081`，保留 MySQL 内部网络、健康检查和独立数据卷。
- 更新 `.env.production.example` 和 `docs/deployment.md`，增加 ACR 镜像、ECS 登录、拉取、更新和回滚说明。

本阶段没有连接 ECS、没有执行 Docker 生产部署、没有创建 ACR 资源、没有修改已有容器/镜像/数据卷，也没有修改 Nginx 或防火墙。

## 2. 修改文件

- `.github/workflows/docker.yml`
- `compose.yaml`
- `.env.production.example`
- `docs/deployment.md`
- `docs/handoff-stage4.3.md`
- `docs/handoff-stage4.5.md`

## 3. ACR 配置状态

当前无法确认或操作 ACR：

- 本机未安装 `aliyun` CLI。
- 本机未安装 `gh` CLI，无法检查 GitHub 登录状态或设置 Variables/Secrets。
- 没有从阿里云控制台获得实际 Registry 地址，因此仓库配置没有猜测域名。
- workflow 使用以下待配置项：
  - GitHub Variables：`ACR_REGISTRY`、`ACR_NAMESPACE`、`ACR_REPOSITORY`。
  - GitHub Secrets：`ACR_USERNAME`、`ACR_PASSWORD`。

建议值为 Namespace `codeseed-demo`、Repository `codeseed`、Private，但 Registry 地址必须使用阿里云 ACR 控制台提供的实际地址。

## 4. GitHub Actions 执行结果

本阶段没有触发 GitHub Actions，也没有修改 GitHub Secrets/Variables。现有 workflow 的行为为：

1. 每次 `main` push 或手动触发时登录 GHCR。
2. 检查 ACR 配置完整性。
3. 复用一次 `linux/amd64` Buildx 构建。
4. 始终推送 GHCR：`latest` 和 `sha-<commit>`。
5. ACR 配置完整时，额外推送同名的 `latest` 和 `sha-<commit>`。
6. 继续使用 `vars.NEXT_PUBLIC_SITE_URL` 作为构建参数。

尚未验证 ACR 推送成功，原因是 ACR Registry 地址和凭据尚未配置，且当前没有 GitHub CLI 登录。

## 5. ECS 部署准备情况

Compose 已按 ECS 预构建镜像模式准备：

- `web` 通过 `WEB_IMAGE` 拉取 ACR 镜像，不包含 `build` 配置。
- `WEB_PORT` 默认使用 `18081`，容器内仍为 `3000`。
- `db` 不映射宿主机端口，只通过内部网络访问。
- MySQL 使用项目专属 Compose 命名卷。
- `COMMENTS_PUBLIC=false`、`COMMENTS_TRUST_PROXY=false` 默认保持关闭。
- 旧 Java、MySQL、Redis 容器未被操作；部署前仍必须在 ECS 上重新检查容器、18081 端口、内存和磁盘。

## 6. 安全检查结果

- 未读取、打印或提交 SSH 私钥。
- 未读取或打印阿里云 AccessKey/Secret。
- 未在 workflow 或仓库中写入 Registry 密码。
- ACR 密码只通过 GitHub Secrets 使用；ECS 登录建议使用 `docker login --password-stdin`。
- 没有执行 `docker system prune`、`docker compose down -v` 或任何删除容器/数据卷操作。
- 没有开放数据库端口、修改 Nginx、防火墙或安全组。
- workflow 不自动将镜像发布到 ECS。
- 仍将应用内存限流视为单实例防护，不视为完整公网安全边界。

## 7. 尚需人工授权或控制台操作

请在阿里云控制台完成并确认：

1. 确认 ECS 所在地域可用的 ACR 实例，优先选择同地域实例。
2. 创建或确认 Private Namespace `codeseed-demo` 和 Repository `codeseed`。
3. 获取控制台展示的实际 Registry 登录地址（按登录工具要求填写地址，不自行添加协议或猜测域名）。
4. 创建最小权限的 RAM 身份，只授予该仓库推送/拉取所需权限；不要提供主账号 AccessKey。
5. 在 GitHub 仓库 Settings → Secrets and variables → Actions 中设置：
   - Variables：`ACR_REGISTRY`、`ACR_NAMESPACE=codeseed-demo`、`ACR_REPOSITORY=codeseed`。
   - Secrets：`ACR_USERNAME`、`ACR_PASSWORD`。
6. 确认 `NEXT_PUBLIC_SITE_URL` GitHub Variable 的值。
7. 在 ECS 上先执行只读检查，确认 18081、内存、磁盘、现有容器和安全组后，再人工批准生产启动。

不要把 AccessKey、Secret、Registry 密码或 SSH 私钥发到对话、仓库或日志中。

## 8. 下一步命令

### GitHub Actions 验证

在配置 ACR Variables/Secrets 后，通过 GitHub Actions 手动触发 workflow。确认日志中：

- GHCR login 成功。
- ACR login 成功且没有输出密码。
- 同一次 Buildx 构建完成。
- GHCR 和 ACR 均出现 `latest`、`sha-<commit>` 标签。

### ECS 只读检查（人工批准前）

```bash
docker version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
ss -ltnp
free -h
df -h
```

确认无冲突且获得批准后，才执行：

```bash
cp .env.production.example .env.production
chmod 600 .env.production
# 编辑 WEB_IMAGE、NEXT_PUBLIC_SITE_URL、数据库密码和 WEB_PORT=18081
docker compose --env-file .env.production -p codeseed config
docker compose --env-file .env.production -p codeseed pull web
docker compose --env-file .env.production -p codeseed up -d
```

以上 ECS 命令本阶段未执行。
