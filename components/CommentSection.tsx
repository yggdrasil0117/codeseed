'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'

const PAGE_SIZE = 10
const MAX_NICKNAME_LENGTH = 32
const MAX_CONTENT_LENGTH = 1000

interface CommentItem {
  id: number
  articleSlug: string
  nickname: string
  content: string
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface CommentSectionProps {
  articleSlug: string
}

function characterLength(value: string) {
  return Array.from(value).length
}

function formatCommentDate(value: string) {
  const parsed = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function readResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as {
    data?: CommentItem[]
    pagination?: Pagination
    message?: string
    error?: string
    fields?: Record<string, string>
  }
}

export default function CommentSection({ articleSlug }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [loadingPage, setLoadingPage] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')

  const loadComments = useCallback(
    async (page: number) => {
      setLoadingPage(true)
      setLoadError('')
      try {
        const response = await fetch(
          `/api/articles/${encodeURIComponent(articleSlug)}/comments?page=${page}&limit=${PAGE_SIZE}`,
          { cache: 'no-store' }
        )
        const result = await readResponse(response)
        if (!response.ok) {
          throw new Error(
            result.error === 'comments_disabled' || result.error === 'comments_unavailable'
              ? '评论服务暂时不可用，请稍后再试。'
              : result.message || '评论加载失败，请稍后再试。'
          )
        }
        setComments(result.data || [])
        setPagination(result.pagination || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 })
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : '评论加载失败，请稍后再试。')
      } finally {
        setLoading(false)
        setLoadingPage(false)
      }
    },
    [articleSlug]
  )

  useEffect(() => {
    void loadComments(1)
  }, [loadComments])

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const trimmedNickname = nickname.trim()
    const trimmedContent = content.trim()
    setSubmitError('')
    setSubmitMessage('')

    if (
      characterLength(trimmedNickname) < 1 ||
      characterLength(trimmedNickname) > MAX_NICKNAME_LENGTH
    ) {
      setSubmitError(`昵称长度必须为 1-${MAX_NICKNAME_LENGTH} 个字符。`)
      return
    }
    if (
      characterLength(trimmedContent) < 1 ||
      characterLength(trimmedContent) > MAX_CONTENT_LENGTH
    ) {
      setSubmitError(`评论正文长度必须为 1-${MAX_CONTENT_LENGTH} 个字符。`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/articles/${encodeURIComponent(articleSlug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmedNickname, content: trimmedContent }),
      })
      const result = await readResponse(response)
      if (!response.ok) {
        if (result.error === 'comments_disabled') {
          throw new Error('评论提交功能尚未开放。')
        }
        if (result.error === 'rate_limited') {
          throw new Error('提交过于频繁，请稍后再试。')
        }
        if (result.error === 'comments_unavailable') {
          throw new Error('评论服务暂时不可用，请稍后再试。')
        }
        throw new Error(result.message || '评论提交失败，请稍后再试。')
      }

      setContent('')
      setSubmitMessage('评论已提交，等待审核。')
      // Pending comments are intentionally not inserted into the public list.
      await loadComments(1)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '评论提交失败，请稍后再试。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      className="border-brand-border mt-12 border-t pt-8 dark:border-gray-800"
      aria-labelledby="comments-heading"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold">交流想法</p>
          <h2
            id="comments-heading"
            className="text-brand-foreground mt-1 text-2xl font-bold dark:text-white"
          >
            文章评论
          </h2>
        </div>
        <span className="text-brand-muted text-sm dark:text-gray-400">
          {pagination.total} 条已审核评论
        </span>
      </div>

      <form
        onSubmit={submitComment}
        className="border-brand-border mt-6 rounded-xl border bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
          <label className="text-brand-foreground text-sm font-medium dark:text-gray-200">
            昵称
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={MAX_NICKNAME_LENGTH}
              placeholder="怎么称呼你？"
              className="border-brand-border focus:border-primary-500 focus:ring-primary-200 dark:focus:ring-primary-900 mt-2 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-hidden focus:ring-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              aria-describedby="nickname-count"
            />
            <span
              id="nickname-count"
              className="text-brand-muted mt-1 block text-xs dark:text-gray-500"
            >
              {characterLength(nickname)}/{MAX_NICKNAME_LENGTH}
            </span>
          </label>
          <label className="text-brand-foreground text-sm font-medium dark:text-gray-200">
            评论内容
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={MAX_CONTENT_LENGTH}
              rows={4}
              placeholder="分享你的学习心得或问题……"
              className="border-brand-border focus:border-primary-500 focus:ring-primary-200 dark:focus:ring-primary-900 mt-2 block w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm leading-6 outline-hidden focus:ring-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              aria-describedby="content-count"
            />
            <span
              id="content-count"
              className="text-brand-muted mt-1 block text-right text-xs dark:text-gray-500"
            >
              {characterLength(content)}/{MAX_CONTENT_LENGTH}
            </span>
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm">
            {submitError && <p className="text-red-600 dark:text-red-400">{submitError}</p>}
            {submitMessage && (
              <p className="text-emerald-600 dark:text-emerald-400">{submitMessage}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-900 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed"
          >
            {submitting ? '提交中……' : '提交评论'}
          </button>
        </div>
      </form>

      <div className="mt-6" aria-live="polite">
        {loading && <p className="text-brand-muted text-sm dark:text-gray-400">正在加载评论……</p>}
        {!loading && loadError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {loadError}
          </div>
        )}
        {!loading && !loadError && comments.length === 0 && (
          <div className="border-brand-border text-brand-muted rounded-lg border border-dashed p-6 text-center text-sm dark:border-gray-800 dark:text-gray-400">
            暂无已审核评论，欢迎分享你的第一个想法。
          </div>
        )}
        {!loading && !loadError && comments.length > 0 && (
          <div className="divide-brand-border divide-y dark:divide-gray-800">
            {comments.map((comment) => (
              <article key={comment.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-brand-foreground text-sm font-semibold dark:text-gray-200">
                    {comment.nickname}
                  </span>
                  <time
                    className="text-brand-muted text-xs dark:text-gray-500"
                    dateTime={comment.createdAt}
                  >
                    {formatCommentDate(comment.createdAt)}
                  </time>
                </div>
                <p className="text-brand-muted mt-2 text-[15px] leading-7 break-words whitespace-pre-wrap dark:text-gray-300">
                  {comment.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {!loading && !loadError && pagination.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="评论分页">
          <button
            type="button"
            disabled={loadingPage || pagination.page <= 1}
            onClick={() => void loadComments(pagination.page - 1)}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 disabled:text-gray-400"
          >
            ← 上一页
          </button>
          <span className="text-brand-muted dark:text-gray-400">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <button
            type="button"
            disabled={loadingPage || pagination.page >= pagination.totalPages}
            onClick={() => void loadComments(pagination.page + 1)}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 disabled:text-gray-400"
          >
            下一页 →
          </button>
        </nav>
      )}
    </section>
  )
}
