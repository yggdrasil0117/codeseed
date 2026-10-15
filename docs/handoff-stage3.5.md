# CodeSeed · 码芽 Stage 3.5 交接文档

## 1. 本次检查发现的问题

- 全局 `SectionContainer` 使用 `max-w-6xl`，在 1440px 桌面屏下内容区约为 1088px（扣除内边距后），首页 Hero、文章流和侧栏显得偏窄。
- `ArticleCard` 原本同时使用较大的内边距、三行摘要、标签区和独立 CTA，卡片纵向间距偏多，首页和文章列表的信息密度不足。
- 文章元信息、导航、列表侧栏和热门标签多处使用 `text-sm`，中文显示在桌面端偏小。
- 首页分类卡片只有文字，没有快速识别的视觉符号，卡片 hover 反馈也比较弱。
- 首页和列表页虽然已有移动端断点，但主内容网格缺少显式 `min-w-0`，在宽内容、长中文标题或横向代码内容出现时存在溢出风险。
- 检查确认没有发现需要通过隐藏报错来解决的运行时问题；本次仅调整真实的布局参数和内容密度。

## 2. 完成的视觉优化

- 将全局内容容器调整为 `max-w-[1240px]`，保持移动端 `px-4`、平板端 `sm:px-6` 和桌面端 `lg:px-8` 留白。
- 精简共享 `ArticleCard`：
  - 默认内边距调整为 `p-4`，桌面稍大屏幕保留 `sm:p-5`。
  - 标题和摘要间距收紧，摘要从最多三行调整为最多两行。
  - 元信息和阅读入口提升到约 15px，标签和 CTA 间距收紧。
  - 首页与 `ListLayoutWithTags` 继续共用同一组件，没有复制两套卡片实现。
- 首页分类卡片增加六个轻量内联 SVG 图标：代码、布局、服务、Python、CPU 和 Git。
- 分类卡片增加轻微边框、背景和阴影 hover 反馈，没有引入渐变或复杂动画。
- 提升 Header 导航、文章列表侧栏、列表计数、首页侧栏说明和热门标签的中文可读性。
- 首页、列表页主网格增加 `min-w-0`，减少宽内容对子布局的挤压；保留移动端单列和标签横向滚动结构。
- 未修改文章内容、Contentlayer 数据模型、搜索、标签、分页、路由或依赖。

## 3. 修改文件

- `components/SectionContainer.tsx`
- `components/ArticleCard.tsx`
- `app/Main.tsx`
- `layouts/ListLayoutWithTags.tsx`
- `components/Header.tsx`
- `docs/handoff-stage3.5.md`

## 4. 实际验证结果

- Prettier：本阶段修改的 TSX 文件格式化通过。
- `git diff --check`：通过。
- 生产构建：通过。
  - 使用 Windows PowerShell 兼容方式：先设置 `$env:INIT_CWD = (Get-Location).Path`，再执行 `corepack yarn next build`。
  - Next.js 编译、TypeScript、ESLint/Prettier 检查通过。
  - 生成 40 个静态页面，原有文章详情、分页和标签路由均继续生成。
- 生产服务 HTTP smoke test：以下路径均返回 HTTP 200：
  - `/`
  - `/blog/`
  - `/blog/page/2/`
  - `/tags/`
  - `/tags/编程入门/`
  - `/blog/programming-basics-what-is-programming/`
  - `/search.json`
- 搜索索引仍为 6 条中文文章记录。
- 首页 HTML 实际包含 CodeSeed 品牌、分类标题和 SVG 图标。
- 未安装 `playwright`、`@playwright/test` 或 `puppeteer`，因此没有进行真实浏览器截图和点击测试。

## 5. 响应式与横向溢出结论

- 源码级检查确认：全局容器在 375px 下使用固定水平内边距，不使用固定宽度；首页与文章列表主网格使用 `min-w-0`；文章卡片标题允许换行；移动端分类导航使用 `overflow-x-auto`；文章详情正文和代码块已有横向滚动约束。
- 768px 和 1440px 的断点结构分别使用单列/双列和宽容器布局，未新增会强制撑宽视口的固定尺寸。
- 由于当前环境缺少浏览器自动化工具，375px、768px、1440px 的最终像素级视觉效果和滚动条状态仍需在真实浏览器中人工确认。

## 6. 遗留问题与下一步建议

- 建议下一步在 Chrome DevTools 中使用 375×812、768×1024 和 1440×900 分别检查：Hero 换行、分类卡片排列、侧栏粘性位置、移动端菜单、深色模式和横向滚动条。
- 如果部署域名已确定，可继续设置 `NEXT_PUBLIC_SITE_URL` 并检查 canonical、RSS 和 sitemap；本阶段未涉及部署。
- 当前未新增依赖、后端、数据库或用户交互功能，也未删除 MIT License。
