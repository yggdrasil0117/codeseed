import { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'
import { formatDate } from 'pliny/utils/formatDate'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'

interface ArticleCardProps {
  post: CoreContent<Blog>
}

export default function ArticleCard({ post }: ArticleCardProps) {
  const minutes = Math.max(1, Math.ceil(post.readingTime?.minutes || 1))

  return (
    <article className="group border-brand-border bg-brand-card hover:border-primary-200 dark:hover:border-primary-800 rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-brand-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] dark:text-gray-400">
        <time dateTime={post.date} suppressHydrationWarning>
          {formatDate(post.date, siteMetadata.locale)}
        </time>
        <span aria-hidden="true">·</span>
        <span>约 {minutes} 分钟阅读</span>
      </div>
      <h2 className="text-brand-foreground mt-2 text-lg leading-7 font-bold tracking-tight sm:text-xl dark:text-white">
        <Link
          href={`/${post.path}`}
          className="group-hover:text-primary-600 dark:group-hover:text-primary-400 break-words transition-colors"
        >
          {post.title}
        </Link>
      </h2>
      {post.summary && (
        <p className="text-brand-muted mt-2 line-clamp-2 text-[15px] leading-6 dark:text-gray-400">
          {post.summary}
        </p>
      )}
      {post.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-y-1">
          {post.tags.map((tag) => (
            <Tag key={tag} text={tag} />
          ))}
        </div>
      )}
      <div className="text-primary-600 dark:text-primary-400 mt-3 text-[15px] font-semibold">
        <Link href={`/${post.path}`} aria-label={`阅读文章：${post.title}`}>
          阅读全文 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}
