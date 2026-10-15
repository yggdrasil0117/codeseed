# CodeSeed · 码芽第三阶段交接文档

## 1. 完成的 UI 修改

- 首页改造成中文技术社区信息流：
  - 增加 CodeSeed 品牌 Hero、Slogan、简介和“开始阅读 / 浏览分类”按钮。
  - 增加编程入门、前端开发、后端开发、Python、计算机基础、开发工具六个分类入口。
  - 分类链接通过 `github-slugger` 和现有 `tag-data.json` 生成，只有实际存在的标签才会展示。
  - 增加真实文章信息流、文章数量、热门标签、新手阅读建议和站点介绍侧栏。
  - 首页展示全部现有中文文章，不使用虚假的访问量、点赞量或在线人数。
- 统一文章卡片视觉：细边框、白色内容面、圆角、轻量悬停反馈、中文日期、阅读时长、摘要和标签。
- 文章列表页保留原有 Contentlayer 数据、标签过滤和分页路由，改为与首页统一的文章卡片；桌面端保留分类侧栏，移动端使用横向标签导航和单列文章流。
- 文章详情页优化中文阅读体验：
  - 标题、日期、作者和阅读时长层级重新整理。
  - 根据 Contentlayer 的 `toc` 数据展示桌面端侧边目录和移动端目录卡片。
  - 正文限制可读宽度，代码块支持横向滚动，优化中文段落行高、引用和表格容器。
  - 保留 Markdown、代码高亮、KaTeX、标题锚点、标签、前后文章和 SEO 数据流。
- 统一品牌视觉：
  - 复用并改造 Tailwind 主题变量，使用 CodeSeed 蓝色 `#2563EB`、背景 `#F8FAFC`、卡片白色、主文字 `#0F172A`、次文字 `#64748B` 和边框 `#E2E8F0`。
  - 页面容器扩展为适合桌面信息流的宽度，保留浅色、深色和系统主题能力。
  - 使用中文系统字体回退栈，并增加正文、代码块、引用和目录样式。
  - 更新 CodeSeed SVG Logo 和 SVG favicon，调整主题色和浏览器图标颜色。
  - 主题切换菜单中文化为“浅色 / 深色 / 跟随系统”。
- 清理非核心英文模板入口：移除 `/about`、`/projects` 路由和项目数据文件，并从 sitemap 移除 `/projects`。
- 保留 Footer 中的上游模板来源、原作者版权信息和 MIT License 说明。

## 2. 修改的文件

### 核心 UI 与样式

- `app/Main.tsx`
- `components/ArticleCard.tsx`
- `layouts/ListLayoutWithTags.tsx`
- `layouts/PostLayout.tsx`
- `components/SectionContainer.tsx`
- `components/Header.tsx`
- `components/ThemeSwitch.tsx`
- `css/tailwind.css`

### 全局品牌与 SEO 资源

- `app/layout.tsx`
- `app/sitemap.ts`
- `data/logo.svg`
- `public/static/favicons/favicon.svg`

### 清理的非核心模板文件

- 删除 `app/about/page.tsx`
- 删除 `app/projects/page.tsx`
- 删除 `data/projectsData.ts`

## 3. 新增或调整的组件

- 新增 `components/ArticleCard.tsx`，作为首页和文章列表共用的轻量文章卡片。
- `ListLayoutWithTags` 继续使用原有 props、Contentlayer `CoreContent<Blog>` 数据、标签 slug 和分页接口，仅调整展示结构。
- `PostLayout` 继续使用现有 MDX children 和 Contentlayer 内容，新增 `TOCInline` 展示目录，没有修改 Markdown 编译链。
- Header、主题切换、全局容器和 Tailwind 基础样式做了视觉与中文无障碍文案调整。

## 4. 实际运行的测试与结果

- `git diff --check`：通过。
- 生产构建：通过。
  - Windows PowerShell 兼容方式为先设置 `$env:INIT_CWD = (Get-Location).Path`，再执行 `corepack yarn next build`。
  - Next.js 编译、TypeScript 类型检查和 ESLint/Prettier 检查通过。
  - 生成 40 个静态页面。
  - 6 篇中文文章详情、文章分页、标签页和标签分页均生成成功。
- `corepack yarn node ./scripts/postbuild.mjs`：通过，RSS feed 生成成功。
- 生产服务 HTTP smoke test：通过，以下路径均返回 200 且页面包含 CodeSeed 品牌：
  - `/`
  - `/blog/`
  - `/blog/page/2/`
  - `/tags/`
  - `/tags/编程入门/`
  - `/blog/programming-basics-what-is-programming/`
- `/search.json`：返回 200，共 6 条搜索记录，标题均为中文文章。
- `/sitemap.xml`：返回 200。
- 已删除的 `/about/` 和 `/projects/`：均返回 404，且不再进入 sitemap。
- 未发现 newsletter 或评论入口出现在页面渲染结果中；相关模板组件仍作为配置关闭时的兼容代码保留，当前 `siteMetadata` 的 newsletter/comments 均为关闭状态。

## 5. 未解决的问题

- 当前没有可用的浏览器自动化/截图环境，因此没有完成 1440px、768px、375px 的真实像素级视觉验收，也没有通过真实点击验证移动抽屉和主题菜单；响应式断点、主题 class、路由链接和 HTTP 页面已完成代码级与构建级检查。
- Windows 下直接执行 `corepack yarn build` 仍可能受到 `package.json` 中 `INIT_CWD=$PWD` 的 shell 变量写法影响。本阶段使用显式 PowerShell 环境变量和直接 Next build 的兼容方式完成验证。Linux 云服务器按原脚本执行时应使用 Bash 环境。
- 旧的 PNG favicon、`public/static/images/logo.png`、`twitter-card.png` 和默认头像文件仍在仓库中作为未使用静态资源保留；页面实际使用了新的 SVG Logo/favicon。后续可在确认外部引用后再删除或替换这些二进制资源。
- `components/Comments.tsx`、`PostSimple.tsx`、`PostBanner.tsx` 等可选模板代码仍存在，但评论配置关闭且主文章均使用 `PostLayout`，因此不会展示评论入口。
- 本阶段没有进行静态导出和 Nginx 部署，符合任务范围。

## 6. 移动端和深色模式验证情况

- 移动端导航组件、全局搜索和主题切换仍位于全局布局中；首页和文章列表使用响应式单列/多列断点，列表标签在窄屏下可横向滚动，详情页目录在移动端下移为内容卡片。
- 深色模式样式保留并覆盖 Header、Hero、文章卡片、分类卡片、侧栏、分页、正文、代码块和目录。
- 由于本轮没有浏览器自动化工具，以上两项完成了源码 class、构建和 HTTP 级验证，尚未完成真实设备截图验收。

## 7. 下一阶段建议

1. 在真实浏览器中完成 1440px、768px、375px 的截图验收，重点检查 Hero 换行、长中文标题、分类横向滚动、文章目录和代码块溢出。
2. 根据最终部署域名设置 `NEXT_PUBLIC_SITE_URL`，重新验证 canonical、Open Graph、RSS 和 sitemap 地址。
3. 如果需要完全静态 Nginx 部署，使用 `EXPORT=true` 和 `UNOPTIMIZED=true` 做一次独立构建验收；否则采用 Node.js `next start` 配合 Nginx 反向代理。
4. 后续可补充学习路线或精选文章区域，但继续复用现有静态 Contentlayer 数据，不引入用户系统、数据库或社区后端。
