# CodeSeed · 码芽第二阶段交接文档

## 1. 本阶段完成内容

- 完成 CodeSeed · 码芽品牌基础配置：
  - 网站名称：CodeSeed · 码芽
  - Slogan 可由下一阶段首页 Hero 使用：从第一行代码，开始你的成长。
  - 网站介绍：面向编程初学者的技术学习与知识分享平台。
  - 默认语言和 locale 调整为 zh-CN。
  - 默认主题调整为浅色，同时保留深色模式和系统切换能力。
  - siteUrl 使用 NEXT_PUBLIC_SITE_URL 环境变量，未设置时回退到 http://localhost:3000。
- 完成全局中文导航：首页、文章、分类。
- 保留全局 KBar 搜索和主题切换；移动端导航保留 Headless UI 交互。
- 移除 Footer 中的模板社交链接和无效社交入口，保留原模板 MIT License 相关版权与来源说明。
- 将 Tailwind primary 色阶调整为蓝色，主色包含 #2563EB；增加品牌背景、卡片、文字和次要文字色变量。
- 移除 Google 字体加载，改用适合中文阅读的系统字体栈，减少构建时网络依赖。
- 更新全局页面 lang、Open Graph 和文章 SEO locale 为 zh-CN。
- 关闭 newsletter 和评论功能：
  - newsletter provider 设置为 null。
  - 删除 newsletter API Route。
  - 移除 MDX Newsletter 组件映射。
  - comments 配置设置为 null，因此文章详情不会渲染评论入口。
- 清理模板作者信息，移除未使用的第二作者。
- 移除原有英文/加拿大示例文章，新增 6 篇面向零基础读者的中文文章。
- 对首页、文章列表、标签页和文章详情的主要可见文案做中文化；未重构文章列表和详情页布局结构。
- 移除文章详情中会指向上游不存在路径的 GitHub 源文件入口。

## 2. 修改文件清单

### 品牌、配置和 SEO

- data/siteMetadata.js
- data/headerNavLinks.ts
- app/layout.tsx
- app/seo.tsx
- app/blog/[...slug]/page.tsx
- css/tailwind.css

### 导航、页脚和基础 UI

- components/Header.tsx
- components/MobileNav.tsx
- components/Footer.tsx
- components/SearchButton.tsx
- components/Tag.tsx
- components/MDXComponents.tsx
- app/Main.tsx
- app/blog/page.tsx
- app/blog/page/[page]/page.tsx
- app/tags/page.tsx
- app/tags/[tag]/page.tsx
- layouts/ListLayoutWithTags.tsx
- layouts/PostLayout.tsx
- layouts/PostSimple.tsx
- layouts/PostBanner.tsx

### 删除的无效入口和模板内容

- 删除 app/api/newsletter/route.ts。
- 删除 data/authors/sparrowhawk.mdx。
- 删除 data/blog/ 下原有 11 篇英文/演示文章。
- 保留 LICENSE 未修改。

### 生成或更新的内容索引

- app/tag-data.json：由 Contentlayer 根据新文章重新生成。
- public/search.json：包含 6 篇中文文章的搜索索引。
- public/feed.xml 及 public/tags/*/feed.xml：由原有 RSS 后处理脚本生成。

## 3. 新增文章列表

| 文章 | 文件 | 日期 | 主要标签 |
| --- | --- | --- | --- |
| 什么是编程？从第一行代码理解程序 | data/blog/programming-basics-what-is-programming.mdx | 2026-10-15 | 编程入门、学习方法 |
| 前端入门：HTML、CSS 和 JavaScript 的区别 | data/blog/frontend-html-css-javascript.mdx | 2026-10-14 | 前端开发、编程入门、Web 基础 |
| 后端入门：什么是后端和 API？ | data/blog/backend-api-introduction.mdx | 2026-10-13 | 后端开发、API、编程入门 |
| Python 入门：编写第一个 Python 程序 | data/blog/python-first-program.mdx | 2026-10-12 | Python、编程入门 |
| 计算机基础：HTTP 请求的基本流程 | data/blog/computer-network-http-request.mdx | 2026-10-11 | 计算机基础、HTTP、网络基础 |
| 开发工具：Git 常用命令入门 | data/blog/development-tools-git-basics.mdx | 2026-10-10 | 开发工具、Git、编程入门 |

每篇文章均使用现有 Contentlayer frontmatter、default 作者和 PostLayout，正文包含解释、列表和可运行示例代码。

## 4. 构建与测试结果

### 生产构建

- 直接执行 corepack yarn build 时，PowerShell 环境先后遇到：
  - Corepack 沙箱内无法解析 repo.yarnpkg.com。
  - 获得网络权限后，项目 package script 中的 INIT_CWD=$PWD 报 Unbound variable "PWD"。
- 使用兼容 PowerShell 的 INIT_CWD 设置后执行：
  - corepack yarn next build
  - corepack yarn node ./scripts/postbuild.mjs
- 结果：
  - Next.js 生产构建通过。
  - TypeScript 类型检查通过。
  - ESLint/Prettier 检查通过。
  - 生成 42 个静态页面。
  - Contentlayer 生成 7 个文档：6 篇博客文章和 1 个作者文档。
  - RSS 与标签 RSS 生成成功。
- 构建仍输出 Contentlayer 在 Windows 上可能存在兼容性风险的警告；这是现有依赖的提示，不是本阶段代码错误。
- 构建还提示 TypeScript project references 在当前模式下不是完全支持，但未阻断构建。

### 内容和搜索检查

- public/search.json 共 6 条文章记录。
- 6 条搜索记录的标题均包含中文内容。
- app/tag-data.json 不再包含原有 hello 草稿标签。
- 6 篇中文文章均出现在 Contentlayer 生成的文章详情路由中。

### 运行时 smoke test

在本地启动已构建的 Next.js 服务后，以下路径均返回 HTTP 200，且页面包含 CodeSeed 品牌和中文内容：

- /
- /blog/
- /tags/
- /blog/programming-basics-what-is-programming/
- /tags/编程入门/

### 主题、移动端和无效入口检查

- ThemeProvider 仍保留 light/dark/system 能力，默认主题为 light。
- Tailwind dark variant、Markdown prose、Prism 代码块和 KaTeX 样式未被删除。
- MobileNav、搜索按钮和主题切换组件仍在全局布局中。
- newsletter API、NewsletterForm 和 BlogNewsletterForm 映射已移除。
- comments 配置为 null，文章详情不会渲染 Load Comments 入口。
- git diff --check 通过。

本阶段没有进行浏览器截图级的像素验收；移动端和深色模式已完成代码路径保留及构建验证，下一阶段应在真实浏览器中做视觉检查。

## 5. 遗留问题

1. package.json 的 build 脚本仍使用 INIT_CWD=$PWD；Windows PowerShell 下需要兼容处理。当前构建已通过显式设置 INIT_CWD 并直接调用 Next build 验证。
2. /about 和 /projects 路由仍保留模板页面内容，但已从主导航移除。下一阶段应决定将其中文化为“关于码芽/学习路线”，或明确移除。
3. public/static/images/logo.png、twitter-card.png 和部分 favicon 仍是模板资源，尚未制作 CodeSeed 专属品牌图。
4. Comments 组件和备用 ListLayout 文件仍保留可选模板代码，但当前配置和主路由不会展示它们。
5. siteRepo 仍保留上游模板仓库地址，用于来源和许可证说明；CodeSeed 自有仓库地址确定后可再替换。
6. 尚未进行静态导出、Nginx 配置或云服务器部署；本阶段按要求不做服务器部署。

## 6. 下一阶段 UI 改造建议

建议第三阶段只围绕首页和信息流体验展开，继续复用当前数据和渲染链：

1. 在 app/Main.tsx 增加品牌 Hero，展示“从第一行代码，开始你的成长。”以及开始阅读按钮。
2. 增加 6 个目标分类入口：编程入门、前端开发、后端开发、Python、计算机基础、开发工具。
3. 抽取一个轻量 ArticleCard，展示标题、摘要、标签、日期和阅读时长；不要引入新的数据层。
4. 在桌面端采用主内容区加右侧栏，右侧展示站点介绍、热门标签和学习路线入口；移动端改为单列。
5. 再调整 ListLayoutWithTags 的卡片视觉和标签侧栏，不改变现有分页、slug 和 Contentlayer 数据流。
6. 保持 PostLayout 的正文排版、代码块、数学公式和 SEO 能力，只做中文阅读体验与间距优化。
7. 在真实浏览器中验证浅色/深色、移动端抽屉、长中文标题、代码块横向滚动和空状态。

