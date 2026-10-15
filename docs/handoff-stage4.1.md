# CodeSeed · 码芽 Stage 4.1 交接文档

## 1. 本阶段完成内容

- 新增 MySQL 8 的文章评论表初始化 SQL，使用 `CREATE TABLE IF NOT EXISTS`，不会主动删除或覆盖已有表数据。
- 新增服务端 MySQL 连接池，连接信息只从 `MYSQL_*` 环境变量读取。
- 使用 `mysql2/promise` 参数化执行查询和写入；数据库模块使用 `server-only`，不会被浏览器端引用。
- 新增评论 REST API：
  - `GET /api/articles/[slug]/comments`
  - `POST /api/articles/[slug]/comments`
- 文章 slug 在访问数据库前通过现有 Contentlayer `allBlogs` 校验，不把文章内容迁移到数据库。
- GET 只查询 `approved` 评论；POST 固定写入 `pending`，客户端不能指定审核状态。
- POST 支持昵称和正文长度校验、文章存在性校验、JSON 错误处理和合理 HTTP 错误码。
- GET 支持 `page` 和 `limit` 分页参数：默认每页 20 条，最大每页 50 条，响应包含 `total` 和 `totalPages`。
- 当前未修改首页、文章列表、文章详情 UI、MDX 数据结构、搜索、标签或分页逻辑。

## 2. 新增文件与配置

### 新增文件

- `db/init.sql`
- `lib/db.ts`
- `lib/comments.ts`
- `lib/commentRateLimit.ts`
- `app/api/articles/[slug]/comments/route.ts`
- `docs/handoff-stage4.1.md`

### 调整文件

- `package.json`：新增本阶段必要依赖 `mysql2` 和 `server-only`。
- `yarn.lock`：由 Corepack Yarn 更新依赖锁定信息。
- `tsconfig.json`：增加 `@/lib/*` 路径映射。
- `.env.example`：增加 MySQL 连接和评论开关配置说明。

## 3. 数据库结构

`db/init.sql` 创建 `article_comments`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | 主键 |
| `article_slug` | `VARCHAR(255)` | 对应现有文章 slug |
| `nickname` | `VARCHAR(32)` | 评论昵称 |
| `content` | `TEXT` | 评论正文 |
| `status` | `VARCHAR(20)` | `pending`、`approved` 或 `rejected`，默认 `pending` |
| `created_at` | `TIMESTAMP` | 创建时间，默认当前时间 |

索引：

- `idx_article_comments_article_status_created`：覆盖文章、审核状态、创建时间和主键，服务于按文章查询已审核评论和稳定排序。
- `idx_article_comments_status_created`：支持后续审核后台按状态和时间筛选。
- 表使用 InnoDB、`utf8mb4` 和 `utf8mb4_unicode_ci`，支持中文昵称和正文。

## 4. API 设计

### GET `/api/articles/[slug]/comments`

请求示例：

```text
GET /api/articles/programming-basics-what-is-programming/comments?page=1&limit=20
```

成功响应 `200`：

```json
{
  "data": [
    {
      "id": 1,
      "articleSlug": "programming-basics-what-is-programming",
      "nickname": "小明",
      "content": "这篇文章很清楚。",
      "createdAt": "2026-10-15 12:00:00"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

GET 只返回 SQL 条件 `status = 'approved'` 的记录，不会向前端暴露 pending 或 rejected 评论。

### POST `/api/articles/[slug]/comments`

请求体只接受：

```json
{
  "nickname": "小明",
  "content": "这是一条评论。"
}
```

- `nickname`：去除首尾空白后 1–32 个字符。
- `content`：去除首尾空白后 1–1000 个字符。
- 路由 slug 必须匹配 Contentlayer 中现有文章。
- 服务端固定插入 `pending`，不会读取或信任客户端传入的 `status`。
- 成功时返回 `201`，提示审核通过后公开展示。

主要错误码：

- `400`：JSON、分页或字段校验失败。
- `404`：文章 slug 不存在。
- `429`：触发提交频率限制，并返回 `Retry-After`。
- `503`：评论功能关闭、数据库配置缺失或数据库暂时不可用。

## 5. 安全措施

- `COMMENTS_PUBLIC` 默认为 `false`；未完成反向代理、HTTPS 和运行环境检查前，匿名 POST 不会开放公网写入。
- 当明确设置 `COMMENTS_PUBLIC=true` 时，服务端按 `x-real-ip` 或代理提供的 `x-forwarded-for` 做固定窗口限流：同一客户端 10 分钟最多 3 次提交。
- 限流表有过期清理和最大跟踪键数量，避免单进程内存无限增长。
- 当前设计适用于 Docker Compose 单 Web 实例；如果后续扩容多个 Web 实例，应将限流迁移到共享网关/WAF 或专用存储后，才能继续开放匿名写入。
- 所有 SQL 使用 `?` 参数化，占位符承载 slug、昵称、正文、分页参数，不拼接用户输入。
- 数据库连接代码位于 `lib/` 服务端模块并导入 `server-only`，没有 `NEXT_PUBLIC_*` 数据库变量，也没有客户端数据库连接。
- 返回给客户端的数据库异常为通用 503，不包含主机、用户名、SQL 或堆栈信息；详细错误只写入服务端日志。
- API 响应设置 `Cache-Control: no-store`，避免评论数据被缓存。
- 当前未增加富文本渲染；前端联调时应使用 React 文本节点渲染评论正文，不使用 `dangerouslySetInnerHTML`。

## 6. 测试结果

### 已执行并通过

- `corepack yarn next build`：通过。
  - Windows PowerShell 下先设置 `$env:INIT_CWD = (Get-Location).Path`。
  - Next.js 编译、TypeScript 检查和 ESLint/Prettier 检查通过。
  - 原有 40 个静态页面继续生成。
  - 动态路由 `/api/articles/[slug]/comments` 出现在构建结果中。
- `git diff --check`：通过。
- 生产服务 API smoke test：
  - 未知文章 GET：`404 article_not_found`。
  - 非法分页 GET：`400 invalid_pagination`。
  - `COMMENTS_PUBLIC=false` 时 POST：`503 comments_disabled`。
  - 有效文章 GET、有效 POST 在未配置数据库时：`503 comments_unavailable`，客户端未收到内部错误细节。
  - 非法昵称/正文：`400 validation_failed`。
  - 未知文章 POST：`404 article_not_found`。
  - 连续有效提交：前三次进入数据库异常处理，第 4 次返回 `429 rate_limited`。
- 原有 `/blog/` 路由在 API 改动后仍返回 `200`。

### 尚未执行的数据库集成测试

当前开发环境没有运行中的 MySQL 8：本机 3306 端口不可用，且没有 Docker CLI；因此以下测试需要在 MySQL/Docker Compose 环境补做：

- 执行 `db/init.sql` 后的真实有效评论 `201` 写入。
- pending 评论写入后不出现在 GET 结果中。
- approved 评论可以被 GET 返回。
- 多条 approved 评论的真实分页、总数和排序。
- MySQL 连接异常、查询异常和连接池恢复行为。

本阶段没有伪造上述集成测试结果，也没有启动或修改其他项目的 Docker 容器。

## 7. 下一阶段前端联调建议

1. 在前端文章详情页增加独立评论区域，调用当前 API；本阶段按要求没有修改现有文章 UI。
2. GET 使用 `pagination.totalPages` 渲染评论分页，空数组显示“暂无已审核评论”。
3. POST 成功后提示“已提交，等待审核”，不要把 pending 内容直接插入公开列表。
4. 前端只提交昵称和正文，不提交 `status`；正文使用普通 React 文本渲染。
5. 在 Docker Compose 中先初始化 MySQL、执行 `db/init.sql`，再配置服务端 `MYSQL_*` 与 `COMMENTS_PUBLIC`。
6. 如果部署在 Nginx 后，确保 Nginx 覆盖而不是拼接 `X-Real-IP` / `X-Forwarded-For`，再评估是否启用匿名 POST。
