import { slug } from 'github-slugger'
import Link from '@/components/Link'
import ArticleCard from '@/components/ArticleCard'
import siteMetadata from '@/data/siteMetadata'
import tagData from 'app/tag-data.json'

const categories = [
  { label: '编程入门', description: '建立编程思维与学习方法', icon: 'code' },
  { label: '前端开发', description: '从网页结构到交互体验', icon: 'layout' },
  { label: '后端开发', description: '理解服务、接口与数据', icon: 'server' },
  { label: 'Python', description: '用简单语法解决真实问题', icon: 'python' },
  { label: '计算机基础', description: '补齐网络与系统知识', icon: 'cpu' },
  { label: '开发工具', description: '掌握 Git 等日常工具', icon: 'git' },
]

function CategoryIcon({ name }: { name: string }) {
  const commonProps = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  }

  if (name === 'layout') {
    return (
      <svg {...commonProps}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M9 9v11" />
      </svg>
    )
  }
  if (name === 'server') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="4" width="16" height="6" rx="1.5" />
        <rect x="4" y="14" width="16" height="6" rx="1.5" />
        <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" />
      </svg>
    )
  }
  if (name === 'python') {
    return (
      <svg {...commonProps}>
        <path d="M12 3c-4 0-4 2-4 3v2h5v2H7c-2 0-4 1-4 4s2 4 4 4h2v-3c0-2 1-3 3-3h4c2 0 4-1 4-4s-2-5-5-5h-3Z" />
        <path d="M12 21c4 0 4-2 4-3v-2h-5v-2h6c2 0 4-1 4-4s-2-4-4-4h-2v3c0 2-1 3-3 3H8c-2 0-4 1-4 4s2 5 5 5h3Z" />
      </svg>
    )
  }
  if (name === 'cpu') {
    return (
      <svg {...commonProps}>
        <rect x="7" y="7" width="10" height="10" rx="1" />
        <path d="M9 1v4M15 1v4M9 19v4M15 19v4M19 9h4M19 14h4M1 9h4M1 14h4" />
        <path d="M10 10h4v4h-4z" />
      </svg>
    )
  }
  if (name === 'git') {
    return (
      <svg {...commonProps}>
        <path d="m20 11-7-7a1.4 1.4 0 0 0-2 0l-2 2 3 3a2 2 0 1 1-1 1l-3-3-5 5a1.4 1.4 0 0 0 0 2l7 7a1.4 1.4 0 0 0 2 0l2-2-3-3a2 2 0 1 1 1-1l3 3 5-5a1.4 1.4 0 0 0 0-2Z" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
    </svg>
  )
}

export default function Home({ posts }) {
  const tagCounts = tagData as Record<string, number>
  const availableCategories = categories.filter((category) => tagCounts[slug(category.label)])
  const popularTags = Object.entries(tagCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 6)

  return (
    <div className="space-y-8 py-8 lg:py-10">
      <section className="border-primary-100 dark:border-primary-900/50 overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-900">
        <div className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:items-center lg:py-14">
          <div>
            <p className="text-primary-600 dark:text-primary-400 mb-4 text-sm font-semibold tracking-[0.18em] uppercase">
              CodeSeed · 码芽
            </p>
            <h1 className="text-brand-foreground max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl dark:text-white">
              从第一行代码，开始你的成长。
            </h1>
            <p className="text-brand-muted mt-5 max-w-2xl text-base leading-8 sm:text-lg dark:text-gray-400">
              发现优质技术文章，探索编程世界，在持续学习中积累自己的知识。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/blog/"
                className="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition focus:ring-2 focus:ring-offset-2 focus:outline-hidden dark:focus:ring-offset-gray-900"
              >
                开始阅读
              </Link>
              <Link
                href="/tags/"
                className="border-brand-border text-brand-foreground hover:border-primary-300 hover:text-primary-600 focus:ring-primary-500 dark:hover:border-primary-700 dark:hover:text-primary-400 rounded-lg border bg-white px-5 py-3 text-sm font-semibold transition focus:ring-2 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                浏览分类
              </Link>
            </div>
          </div>
          <div className="border-primary-100 bg-primary-50/70 dark:border-primary-900/60 dark:bg-primary-950/30 rounded-xl border p-5">
            <div className="text-primary-700 dark:text-primary-300 mb-4 flex items-center gap-2 text-sm font-medium">
              <span className="bg-primary-500 h-2.5 w-2.5 rounded-full" />
              给新手的学习空间
            </div>
            <div className="rounded-lg bg-slate-950 p-5 font-mono text-sm leading-7 text-slate-300 shadow-lg">
              <p>
                <span className="text-sky-400">const</span> goal ={' '}
                <span className="text-emerald-300">&apos;keep learning&apos;</span>
              </p>
              <p>
                <span className="text-sky-400">while</span> (goal) &#123;
              </p>
              <p className="pl-4 text-slate-400">read(); practice(); build();</p>
              <p>&#125;</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="category-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">学习路径</p>
            <h2
              id="category-heading"
              className="text-brand-foreground mt-1 text-2xl font-bold dark:text-white"
            >
              探索技术分类
            </h2>
          </div>
          <Link
            href="/tags/"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 hidden text-sm font-semibold sm:block"
          >
            查看全部分类 →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableCategories.map((category) => (
            <Link
              key={category.label}
              href={`/tags/${slug(category.label)}/`}
              className="group border-brand-border hover:border-primary-300 dark:hover:border-primary-800 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 rounded-xl border bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/60 mb-3 inline-flex rounded-lg p-2 transition-colors">
                <CategoryIcon name={category.icon} />
              </span>
              <span className="text-brand-foreground block font-semibold dark:text-white">
                {category.label}
              </span>
              <span className="text-brand-muted mt-1 block text-[15px] leading-6 dark:text-gray-400">
                {category.description}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <section aria-labelledby="latest-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
                持续积累
              </p>
              <h2
                id="latest-heading"
                className="text-brand-foreground mt-1 text-2xl font-bold dark:text-white"
              >
                最新文章
              </h2>
            </div>
            <span className="text-brand-muted text-sm dark:text-gray-400">
              共 {posts.length} 篇
            </span>
          </div>
          <div className="space-y-4">
            {!posts.length && (
              <p className="border-brand-border text-brand-muted rounded-xl border p-6">
                暂无文章。
              </p>
            )}
            {posts.map((post) => (
              <ArticleCard key={post.path} post={post} />
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/blog/"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-sm font-semibold"
            >
              进入完整文章列表 →
            </Link>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <section className="border-brand-border rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-brand-foreground font-bold dark:text-white">关于 CodeSeed</h2>
            <p className="text-brand-muted mt-3 text-[15px] leading-7 dark:text-gray-400">
              {siteMetadata.description}
            </p>
          </section>
          <section className="border-brand-border rounded-xl border bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-brand-foreground font-bold dark:text-white">热门技术标签</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {popularTags.map(([tag, count]) => (
                <Link
                  key={tag}
                  href={`/tags/${slug(tag)}/`}
                  className="bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-950/50 dark:text-primary-300 dark:hover:bg-primary-900/60 rounded-full px-3 py-1.5 text-sm font-medium transition"
                >
                  {tag} · {count}
                </Link>
              ))}
            </div>
          </section>
          <section className="border-primary-100 bg-primary-50/70 dark:border-primary-900/50 dark:bg-primary-950/30 rounded-xl border p-5">
            <p className="text-primary-700 dark:text-primary-300 text-sm font-semibold">新手建议</p>
            <h2 className="text-brand-foreground mt-2 font-bold dark:text-white">
              先理解编程，再开始刷语法
            </h2>
            <p className="text-brand-muted mt-2 text-[15px] leading-7 dark:text-gray-400">
              从编程基本概念开始，循序阅读，再用小练习验证理解。
            </p>
            <Link
              href="/blog/programming-basics-what-is-programming/"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 mt-3 inline-block text-sm font-semibold"
            >
              阅读入门文章 →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
