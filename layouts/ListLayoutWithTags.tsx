'use client'

import { usePathname } from 'next/navigation'
import { slug } from 'github-slugger'
import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import Link from '@/components/Link'
import ArticleCard from '@/components/ArticleCard'
import tagData from 'app/tag-data.json'

interface PaginationProps {
  totalPages: number
  currentPage: number
}

interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const basePath = pathname
    .replace(/^\//, '')
    .replace(/\/page\/\d+\/?$/, '')
    .replace(/\/$/, '')
  const prevPage = currentPage > 1
  const nextPage = currentPage < totalPages
  const pageHref = (page: number) => (page === 1 ? `/${basePath}/` : `/${basePath}/page/${page}/`)

  return (
    <nav
      className="border-brand-border bg-brand-card mt-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900"
      aria-label="文章分页"
    >
      {prevPage ? (
        <Link
          href={pageHref(currentPage - 1)}
          rel="prev"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold"
        >
          ← 上一页
        </Link>
      ) : (
        <span className="text-gray-400">← 上一页</span>
      )}
      <span className="text-brand-muted dark:text-gray-400">
        第 {currentPage} 页，共 {totalPages} 页
      </span>
      {nextPage ? (
        <Link
          href={pageHref(currentPage + 1)}
          rel="next"
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold"
        >
          下一页 →
        </Link>
      ) : (
        <span className="text-gray-400">下一页 →</span>
      )}
    </nav>
  )
}

export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const pathname = usePathname()
  const tagCounts = tagData as Record<string, number>
  const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])
  const activeTag = pathname.startsWith('/tags/')
    ? decodeURIComponent(pathname.split('/tags/')[1].split('/')[0])
    : ''
  const displayPosts = initialDisplayPosts.length > 0 ? initialDisplayPosts : posts

  return (
    <div className="space-y-5 py-8 lg:py-10">
      <div>
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">
          CodeSeed · 码芽
        </p>
        <h1 className="text-brand-foreground mt-2 text-3xl leading-tight font-bold tracking-tight sm:text-4xl dark:text-white">
          {title}
        </h1>
        <p className="text-brand-muted mt-3 text-[15px] dark:text-gray-400">
          按主题浏览适合编程初学者的技术文章。
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        <Link
          href="/blog/"
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${!activeTag ? 'bg-primary-600 text-white' : 'text-brand-muted bg-white dark:bg-gray-900 dark:text-gray-300'}`}
        >
          全部文章
        </Link>
        {sortedTags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${slug(tag)}/`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${activeTag === slug(tag) ? 'bg-primary-600 text-white' : 'text-brand-muted bg-white dark:bg-gray-900 dark:text-gray-300'}`}
          >
            {tag}
          </Link>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <aside className="border-brand-border bg-brand-card hidden rounded-xl border p-5 lg:block dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-brand-foreground text-[15px] font-bold dark:text-white">文章分类</h2>
          <nav className="mt-4 space-y-1" aria-label="文章分类">
            <Link
              href="/blog/"
              className={`block rounded-lg px-3 py-2 text-[15px] font-medium transition ${!activeTag ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' : 'text-brand-muted hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
            >
              全部文章 <span className="text-xs opacity-70">({posts.length})</span>
            </Link>
            {sortedTags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${slug(tag)}/`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-[15px] transition ${activeTag === slug(tag) ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 font-semibold' : 'text-brand-muted hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                aria-label={`查看「${tag}」分类下的文章`}
              >
                <span>{tag}</span>
                <span className="text-xs opacity-70">{tagCounts[tag]}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <section aria-label={title}>
          <div className="text-brand-muted mb-4 flex items-center justify-between text-[15px] dark:text-gray-400">
            <span>{displayPosts.length} 篇文章</span>
            <Link
              href="/tags/"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold"
            >
              浏览全部分类 →
            </Link>
          </div>
          <div className="space-y-4">
            {!displayPosts.length && (
              <p className="border-brand-border bg-brand-card text-brand-muted rounded-xl border p-6 dark:border-gray-800 dark:bg-gray-900">
                这个分类暂时还没有文章。
              </p>
            )}
            {displayPosts.map((post) => (
              <ArticleCard key={post.path} post={post} />
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
          )}
        </section>
      </div>
    </div>
  )
}
