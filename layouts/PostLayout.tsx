import { ReactNode } from 'react'
import { CoreContent } from 'pliny/utils/contentlayer'
import TOCInline from 'pliny/ui/TOCInline'
import type { Blog, Authors } from 'contentlayer/generated'
import Comments from '@/components/Comments'
import Link from '@/components/Link'
import PageTitle from '@/components/PageTitle'
import SectionContainer from '@/components/SectionContainer'
import Image from '@/components/Image'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import ScrollTopAndComment from '@/components/ScrollTopAndComment'
import CommentSection from '@/components/CommentSection'

const postDateTemplate: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails: CoreContent<Authors>[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  children: ReactNode
}

export default function PostLayout({ content, authorDetails, next, prev, children }: LayoutProps) {
  const { path, slug, date, title, tags, readingTime, toc } = content
  const basePath = path.split('/')[0]
  const minutes = Math.max(1, Math.ceil(readingTime?.minutes || 1))
  const hasToc = Array.isArray(toc) && toc.length > 0

  return (
    <SectionContainer>
      <ScrollTopAndComment />
      <article className="py-8 lg:py-10">
        <header className="border-brand-border mx-auto max-w-4xl border-b pb-8 dark:border-gray-800">
          <div className="text-brand-muted flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm dark:text-gray-400">
            <time dateTime={date}>
              {new Date(date).toLocaleDateString(siteMetadata.locale, postDateTemplate)}
            </time>
            <span aria-hidden="true">·</span>
            <span>约 {minutes} 分钟阅读</span>
          </div>
          <PageTitle>{title}</PageTitle>
        </header>

        <div className="mx-auto mt-8 grid max-w-6xl gap-10 lg:grid-cols-[180px_minmax(0,760px)] lg:justify-center lg:gap-12">
          <aside className="space-y-5 lg:pt-2">
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              {authorDetails.map((author) => (
                <div className="flex items-center gap-2" key={author.name}>
                  {author.avatar && (
                    <Image
                      src={author.avatar}
                      width={38}
                      height={38}
                      alt="作者头像"
                      className="h-9 w-9 rounded-full"
                    />
                  )}
                  <div className="text-sm">
                    <div className="text-brand-foreground font-semibold dark:text-gray-100">
                      {author.name}
                    </div>
                    <div className="text-brand-muted dark:text-gray-400">作者</div>
                  </div>
                </div>
              ))}
            </div>
            {hasToc && (
              <div className="article-toc border-brand-border hidden border-t pt-5 lg:block dark:border-gray-800">
                <h2 className="text-brand-muted mb-3 text-xs font-semibold tracking-wide uppercase dark:text-gray-400">
                  文章目录
                </h2>
                <TOCInline toc={toc} fromHeading={2} toHeading={4} ulClassName="space-y-2" />
              </div>
            )}
          </aside>

          <div className="min-w-0">
            {hasToc && (
              <div className="article-toc border-brand-border mb-8 rounded-xl border bg-gray-50 p-4 lg:hidden dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-brand-foreground mb-3 text-sm font-semibold dark:text-white">
                  文章目录
                </h2>
                <TOCInline toc={toc} fromHeading={2} toHeading={4} ulClassName="space-y-2" />
              </div>
            )}
            <div className="article-content prose prose-slate dark:prose-invert max-w-none pt-1 leading-8">
              {children}
            </div>

            <footer className="border-brand-border mt-10 border-t pt-6 dark:border-gray-800">
              {tags && (
                <div>
                  <h2 className="text-brand-muted text-xs font-semibold tracking-wide uppercase dark:text-gray-400">
                    分类标签
                  </h2>
                  <div className="mt-3 flex flex-wrap">
                    {tags.map((tag) => (
                      <Tag key={tag} text={tag} />
                    ))}
                  </div>
                </div>
              )}

              {(next || prev) && (
                <div className="border-brand-border mt-8 grid gap-4 border-t pt-6 sm:grid-cols-2 dark:border-gray-800">
                  {prev?.path ? (
                    <div>
                      <p className="text-brand-muted text-xs dark:text-gray-400">上一篇文章</p>
                      <Link
                        href={`/${prev.path}`}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 mt-1 block font-semibold"
                      >
                        {prev.title}
                      </Link>
                    </div>
                  ) : (
                    <span />
                  )}
                  {next?.path && (
                    <div className="text-left sm:text-right">
                      <p className="text-brand-muted text-xs dark:text-gray-400">下一篇文章</p>
                      <Link
                        href={`/${next.path}`}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 mt-1 block font-semibold"
                      >
                        {next.title}
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8">
                <Link
                  href={`/${basePath}/`}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold"
                  aria-label="返回文章列表"
                >
                  ← 返回文章列表
                </Link>
              </div>
            </footer>
            {siteMetadata.comments && (
              <div className="pt-6" id="comment">
                <Comments slug={slug} />
              </div>
            )}
            <CommentSection articleSlug={slug} />
          </div>
        </div>
      </article>
    </SectionContainer>
  )
}
