# CodeSeed · 码芽 Stage 4.2 交接文档

## 1. 修改文件

### 新增

- `components/CommentSection.tsx`：文章详情页评论区客户端组件。
- `docs/handoff-stage4.2.md`：本阶段交接记录。

### 修改

- `layouts/PostLayout.tsx`：在正文、标签和文章导航之后接入 `CommentSection`。
- `app/api/articles/[slug]/comments/route.ts`：增加 16KB 请求体限制，并收紧客户端 IP/代理头信任策略。
- `lib/commentRateLimit.ts`：保留服务端固定窗口限流实现，调用方式不变。
- `.env.example`：增加 `COMMENTS_TRUST_PROXY` 配置说明。

Stage 4.2 没有修改首页、文章列表、MDX 内容、Contentlayer 数据模型、搜索、标签或分页路由。

## 2. 前端评论功能实现

`CommentSection` 已在现有 `PostLayout` 中启用，功能包括：

- 页面加载时请求已审核评论。
- 评论为空时展示友好的空状态。
- 昵称与正文输入框，分别显示实时字符数。
- 昵称限制 1–32 个字符，正文限制 1–1000 个字符。
- 提交按钮在请求期间禁用并显示“提交中……”，避免重复点击。
- 成功后显示“评论已提交，等待审核。”并清空正文。
- 成功提交后不会把 pending 评论直接插入公开列表，而是重新加载已审核列表。
- 评论服务关闭、数据库不可用、限流、表单错误均显示中文提示。
- 评论列表使用 API 分页响应的 `totalPages`，提供上一页/下一页。
- 评论正文通过 React 文本节点渲染，`CommentSection.tsx` 不使用 `dangerouslySetInnerHTML`。
- 文章详情既有 Markdown、目录、代码块、标签和响应式结构未改变。

## 3. 数据库与 API 联调情况

Stage 4.1 的数据库结构和 API 已继续复用：

- `db/init.sql` 使用 `CREATE TABLE IF NOT EXISTS`，保留 pending/approved/rejected 状态和索引。
- `lib/db.ts` 使用 `mysql2/promise` 连接池，连接信息来自服务端 `MYSQL_*` 环境变量。
- `lib/comments.ts` 使用参数化 SQL；GET 查询固定带 `status = 'approved'`，POST SQL 固定写入 `pending`。
- Route Handler 使用 Contentlayer `allBlogs` 验证真实文章 slug。
- 未新增评论审核 API，也没有把数据库密码或连接代码放入客户端组件。

真实数据库联调使用了本机安装的 MySQL Server 8.0.44 二进制：

- 在项目目录下创建了全新的临时数据目录，并使用 `--no-defaults`、本机 3307 端口启动隔离实例。
- 创建了仅供本次测试使用的 `codeseed_stage42` 数据库和用户，执行了 `db/init.sql`。
- Next.js 使用该临时实例完成真实写入、查询、审核状态过滤和分页测试。
- 测试结束后停止 MySQL、停止 Next.js，并删除了本次新建的临时数据目录。
- 没有连接或修改系统原有 MySQL 实例、其他项目数据库、容器或数据卷；本机 Docker CLI 不可用，因此没有创建容器。

## 4. API 测试结果

### 已实际验证

- 文章详情页：HTTP `200`，HTML 中包含评论区标题“文章评论”。
- 原有文章列表：HTTP `200`。
- GET 不存在文章：`404 article_not_found`。
- GET 非法分页：`400 invalid_pagination`。
- `COMMENTS_PUBLIC=false` 时 POST：`503 comments_disabled`。
- 数据库未配置时，有效文章 GET：`503 comments_unavailable`，客户端只收到通用错误信息。
- 数据库未配置时，有效文章 POST：`503 comments_unavailable`。
- 真实临时 MySQL 下有效评论：`201`，并通过数据库查询确认写入状态为 `pending`。
- pending 评论首次 GET：`200` 且 `data=[]`、`total=0`。
- 手动审核为 approved 后，GET 返回中文评论；5 条 approved 评论使用 `limit=2` 返回 3 页，排序为 `created_at DESC, id DESC`。
- 额外 pending/rejected 记录不会增加 GET 的 approved 总数，状态过滤通过。
- 非法昵称或正文：`400 validation_failed`。
- 不存在文章 POST：`404 article_not_found`。
- 请求体超过 16KB：`413 payload_too_large`。
- 使用 `COMMENTS_TRUST_PROXY=false` 时，即使连续伪造不同 `X-Real-IP`，前三次进入服务端数据库处理，第 4 次返回 `429 rate_limited`。
- API 响应不会把 MySQL 主机、账号或堆栈返回给客户端。

### 尚未实际验证

以下项目尚未单独验证：

- MySQL 服务重启后的连接池自动恢复行为。
- Docker Compose 网络、健康检查、卷初始化和生产凭据。

## 5. 安全检查结果

- GET SQL 固定筛选 `approved`，没有返回 pending/rejected 的路径。
- POST 不读取客户端 `status`，SQL 固定写入 `pending`。
- 路由 slug 必须匹配现有 Contentlayer 文章。
- 所有用户输入通过 mysql2 `?` 占位符传入，未拼接 SQL。
- 前端评论正文以 React 文本节点渲染，未使用 HTML 注入。
- 服务端流式读取请求体并限制最大 16KB；昵称和正文还有字符数限制。
- `COMMENTS_PUBLIC` 默认关闭，评论写入不会因为部署配置遗漏而直接开放。
- `COMMENTS_TRUST_PROXY` 默认关闭。关闭时不信任客户端提交的 `X-Real-IP` 或 `X-Forwarded-For`，所有直接请求使用保守的共享限流桶，避免通过伪造请求头绕过限流。
- 只有明确设置 `COMMENTS_TRUST_PROXY=true` 且反向代理会覆盖这些头时，才按代理 IP 分桶。
- 当前限流为单进程内存限流，适用于单 Web 实例；多实例部署前必须迁移到共享网关/WAF 或共享存储。
- 没有新增公开的评论审核接口。

## 6. 构建与原有功能

- `corepack yarn next build`：通过。
  - Windows PowerShell 使用 `$env:INIT_CWD = (Get-Location).Path` 兼容方式。
  - Next.js、TypeScript、ESLint/Prettier 检查通过。
  - 原有 40 个静态页面继续生成。
  - `/api/articles/[slug]/comments` 继续作为 Node.js 动态 Route Handler 生成。
- `corepack yarn node ./scripts/postbuild.mjs`：通过，RSS 生成成功。
- `git diff --check`：通过。

## 7. 未解决问题

- 真实 MySQL 联调已使用隔离临时实例完成；当前开发环境的持久实例和 Docker Compose 尚未配置。
- `COMMENTS_PUBLIC=true` 只应在反向代理、HTTPS、代理头覆盖规则和单实例/共享限流策略确认后启用。
- 当前没有评论管理后台；approved 状态需要通过受控 SQL/后续后台流程设置。
- 当前环境没有浏览器自动化工具，因此没有完成移动端评论表单、加载态和分页按钮的真实点击截图验收；生产构建和服务端页面输出已验证。

## 8. 下一阶段 Docker 部署建议

1. 使用项目专属 Docker Compose 服务启动 MySQL 8 和 Next.js，数据库服务使用独立数据库名、用户、密码和命名卷。
2. 先执行 `db/init.sql`，再启动 Web 服务；不要使用 `DROP TABLE` 或复用其他项目数据库。
3. 在 Compose 环境配置 `MYSQL_HOST` 为数据库服务名，设置 `MYSQL_DATABASE`、`MYSQL_USER`、`MYSQL_PASSWORD`，并保留 `COMMENTS_PUBLIC=false` 进行首次验收。
4. 完成真实 pending/approved/分页测试后，再决定是否启用 `COMMENTS_PUBLIC=true`。
5. 如果通过 Nginx 反向代理，明确覆盖 `X-Real-IP` 和 `X-Forwarded-For`，确认后再设置 `COMMENTS_TRUST_PROXY=true`。
6. 多实例或公网部署时，使用网关/WAF 做共享限流；不要把当前单进程 Map 限流当作多实例安全边界。
