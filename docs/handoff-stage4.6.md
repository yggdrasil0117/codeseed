# CodeSeed · 码芽 Stage 4.6 交接文档

## 1. 新增 Workflow

新增 `.github/workflows/export-image.yml`，名称为 `Export GHCR Image for ECS`。

触发方式只有手动 `workflow_dispatch`，输入参数为 `image_tag`，默认 `latest`，也支持 `sha-<commit>`。

现有 GHCR 构建和推送 Workflow 未删除或替换；本阶段新增 Workflow 只负责把已经存在的 GHCR 镜像导出为一次性传输文件，不自动部署 ECS。

## 2. GitHub Actions 导出流程

执行流程：

1. 使用 `GITHUB_TOKEN` 以只读权限登录 `ghcr.io`。
2. 按输入标签拉取 `ghcr.io/yggdrasil0117/codeseed:<tag>`。
3. 使用 `docker pull --platform linux/amd64`，并检查最终镜像 OS/架构。
4. 检查 Runner 临时目录剩余空间，低于 4 GiB 时停止导出。
5. 使用 `docker save` 导出镜像，再用 gzip 压缩。
6. 生成同名 `.sha256` 校验文件。
7. 使用 `actions/upload-artifact@v4` 上传 `.tar.gz` 和 `.sha256`。
8. Artifact 保留 3 天，上传时设置 `compression-level: 0`，避免对已 gzip 文件重复压缩。

Artifact 不包含源代码、`.env.production`、数据库密码、AccessKey、SSH 私钥或其他凭据。

Artifact 存储仍受 GitHub 仓库/组织套餐配额限制；Workflow 只检查 Runner 磁盘并输出压缩文件大小，不宣称可以绕过 GitHub 存储配额。3 天保留期依据 GitHub Actions 的单 Artifact retention 配置能力设置，实际最大期限仍受仓库/组织策略限制：<https://docs.github.com/en/actions/tutorials/store-and-share-data#configuring-a-custom-artifact-retention-period>。

## 3. Windows 下载与上传命令

### GitHub 页面下载

在仓库 Actions 页面运行 `Export GHCR Image for ECS`，下载对应 Artifact 并解压。文件名形如：

```text
codeseed-<tag>-<commit>.tar.gz
codeseed-<tag>-<commit>.tar.gz.sha256
```

### GitHub CLI 下载

如果 Windows 已安装并登录 `gh`：

```powershell
$artifactDir = 'D:\codeseed-artifacts'
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
gh run download <RUN_ID> --repo yggdrasil0117/codeseed --name codeseed-image-<TAG>-<COMMIT_SHA> --dir $artifactDir
```

下载后先核对 SHA256：

```powershell
Get-FileHash (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz') -Algorithm SHA256
Get-Content (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz.sha256')
```

使用现有 SSH config 别名上传，不复制私钥：

```powershell
scp -F "$env:USERPROFILE\.ssh\config" `
  (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz') `
  <SSH_HOST_ALIAS>:/opt/codeseed-transfer/

scp -F "$env:USERPROFILE\.ssh\config" `
  (Join-Path $artifactDir 'codeseed-<tag>-<commit>.tar.gz.sha256') `
  <SSH_HOST_ALIAS>:/opt/codeseed-transfer/
```

本阶段没有执行下载、SCP 或远程连接。

## 4. ECS 镜像导入命令

远程操作必须先经过人工确认。确认 ECS 磁盘、内存、18081 端口和已有容器状态后，在传输目录执行：

```bash
cd /opt/codeseed-transfer
sha256sum -c codeseed-<tag>-<commit>.tar.gz.sha256
docker load --input codeseed-<tag>-<commit>.tar.gz
docker image inspect ghcr.io/yggdrasil0117/codeseed:<tag> --format 'OS={{.Os}} ARCH={{.Architecture}} SIZE={{.Size}}'
```

`docker load` 会恢复原始 GHCR 镜像标签。Compose 使用同一个 `WEB_IMAGE` 值，因此不会因为镜像名称不一致而再次拉取。

## 5. Compose 启动和检查命令

当前 [compose.yaml](../compose.yaml) 保持两个服务：`web` 和 `db`。

- `web` 使用 `${WEB_IMAGE}`，没有 `build` 配置。
- `.env.production.example` 默认使用 `ghcr.io/yggdrasil0117/codeseed:latest`。
- Web 宿主机端口为 `18081:3000`。
- MySQL 不映射宿主机端口，仅连接内部网络。
- MySQL 使用独立 Compose 命名卷。
- `COMMENTS_PUBLIC=false`、`COMMENTS_TRUST_PROXY=false`。

ECS 上准备 `.env.production` 后，先检查配置，再使用本地镜像启动：

```bash
docker compose --env-file .env.production -p codeseed config
docker compose --env-file .env.production -p codeseed up -d --pull never
docker compose --env-file .env.production -p codeseed ps
docker compose --env-file .env.production -p codeseed logs --tail=100 db
docker compose --env-file .env.production -p codeseed logs --tail=100 web
curl -I http://127.0.0.1:18081/
curl -I http://127.0.0.1:18081/blog/
curl -i 'http://127.0.0.1:18081/api/articles/programming-basics-what-is-programming/comments?page=1&limit=20'
```

`--pull never` 是关键保护，避免 ECS 再次尝试从 GHCR 拉取慢速镜像。不要执行 `docker system prune` 或 `docker compose down -v`，不要停止、删除或修改旧 Java、MySQL、Redis 容器和数据卷。

## 6. 磁盘、内存和兼容性风险

- ECS 已知剩余磁盘约 9.4 GB；镜像导入会同时占用压缩包、解压后的镜像层和 Docker 元数据空间，必须在部署前再次执行 `df -h`，不能只看压缩包大小。
- ECS 可用内存约 1.1 GiB，Swap 约 2 GiB；Next.js 和 MySQL 双容器启动时需观察 `free -h`、`docker stats` 和日志，避免同时启动其他旧项目服务。
- Workflow 固定导出 `linux/amd64`；ECS 为 Ubuntu x86_64 时兼容。仍应在 ECS 用 `docker image inspect` 检查 OS/架构。
- `latest` 可能随 GitHub Actions 后续运行变化，正式回滚和复现优先使用 `sha-<commit>` 标签。
- Artifact 是临时传输介质，保留 3 天，不适合作为长期镜像仓库；下载后应完成校验和上传。
- MySQL 数据卷与 Web 镜像无关，Web 更新或导入失败不应删除数据库卷。

## 7. 尚未完成的验证

- 本机 Docker CLI 不可用，未实际运行导出 Workflow、Docker save/gzip、Artifact 下载或 Docker Compose。
- 未从 GitHub Actions 实际下载 Artifact，未在 Windows 上执行 SHA256 校验和 SCP。
- 未在 ECS 上执行 `docker load`、`docker image inspect`、Compose 启动、服务名解析、MySQL 健康检查或持久化重启验证。
- 未检查 ECS 当前 18081 端口、磁盘、内存、安全组和现有容器的实时状态。
- 未连接、登录或修改 ECS，未自动启动正式服务。
