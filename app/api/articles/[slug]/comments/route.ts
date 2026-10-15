import { NextResponse } from 'next/server'
import { allBlogs } from 'contentlayer/generated'
import { createPendingComment, listApprovedComments } from '@/lib/comments'
import { takeCommentRateLimit } from '@/lib/commentRateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const MAX_PAGE = 10000
const MAX_NICKNAME_LENGTH = 32
const MAX_CONTENT_LENGTH = 1000
const MAX_BODY_BYTES = 16 * 1024

type RouteContext = { params: Promise<{ slug: string }> }

function responseBody(body: object, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  })
}

function resolveArticleSlug(value: string) {
  let routeSlug = value
  try {
    routeSlug = decodeURIComponent(value)
  } catch {
    return null
  }

  const article = allBlogs.find(
    (post) =>
      post.slug === routeSlug || post.path === routeSlug || post.path === `blog/${routeSlug}`
  )
  return article?.slug || null
}

function parseInteger(value: string | null, fallback: number, max: number) {
  if (value === null || value === '') return fallback
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) return null
  return parsed
}

function lengthOf(value: string) {
  return Array.from(value).length
}

function getClientKey(request: Request) {
  if (process.env.COMMENTS_TRUST_PROXY !== 'true') return 'direct-client'

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || 'unknown-client'
}

async function readJsonBody(
  request: Request
): Promise<{ value?: unknown; error?: 'too_large' | 'invalid_json' }> {
  const contentLength = request.headers.get('content-length')
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BODY_BYTES) {
    return { error: 'too_large' }
  }

  if (!request.body) return { error: 'invalid_json' }
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel()
      return { error: 'too_large' }
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()

  try {
    return { value: JSON.parse(text) }
  } catch {
    return { error: 'invalid_json' }
  }
}

function databaseErrorResponse() {
  return responseBody(
    { error: 'comments_unavailable', message: '评论服务暂时不可用，请稍后再试。' },
    503
  )
}

export async function GET(request: Request, { params }: RouteContext) {
  const { slug: routeSlug } = await params
  const articleSlug = resolveArticleSlug(routeSlug)
  if (!articleSlug) {
    return responseBody({ error: 'article_not_found', message: '文章不存在。' }, 404)
  }

  const searchParams = new URL(request.url).searchParams
  const page = parseInteger(searchParams.get('page'), 1, MAX_PAGE)
  const limit = parseInteger(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT)
  if (page === null || limit === null) {
    return responseBody(
      { error: 'invalid_pagination', message: 'page 和 limit 必须是合法的正整数。' },
      400
    )
  }

  try {
    const { comments, total } = await listApprovedComments(articleSlug, limit, (page - 1) * limit)
    return responseBody(
      {
        data: comments,
        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      },
      200
    )
  } catch (error) {
    console.error('Failed to list approved article comments', error)
    return databaseErrorResponse()
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  if (process.env.COMMENTS_PUBLIC !== 'true') {
    return responseBody({ error: 'comments_disabled', message: '评论提交功能尚未开放。' }, 503)
  }

  const { slug: routeSlug } = await params
  const articleSlug = resolveArticleSlug(routeSlug)
  if (!articleSlug) {
    return responseBody({ error: 'article_not_found', message: '文章不存在。' }, 404)
  }

  const parsedBody = await readJsonBody(request)
  if (parsedBody.error === 'too_large') {
    return responseBody({ error: 'payload_too_large', message: '请求体不能超过 16KB。' }, 413)
  }
  if (parsedBody.error || parsedBody.value === undefined) {
    return responseBody({ error: 'invalid_json', message: '请求体必须是合法 JSON。' }, 400)
  }
  const body = parsedBody.value

  const payload = body as { nickname?: unknown; content?: unknown }
  const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim() : ''
  const content = typeof payload.content === 'string' ? payload.content.trim() : ''
  const validationErrors: Record<string, string> = {}

  if (lengthOf(nickname) < 1 || lengthOf(nickname) > MAX_NICKNAME_LENGTH) {
    validationErrors.nickname = `昵称长度必须为 1-${MAX_NICKNAME_LENGTH} 个字符。`
  }
  if (lengthOf(content) < 1 || lengthOf(content) > MAX_CONTENT_LENGTH) {
    validationErrors.content = `评论正文长度必须为 1-${MAX_CONTENT_LENGTH} 个字符。`
  }
  if (Object.keys(validationErrors).length > 0) {
    return responseBody(
      { error: 'validation_failed', message: '请检查评论内容。', fields: validationErrors },
      400
    )
  }

  const rateLimit = takeCommentRateLimit(getClientKey(request))
  if (!rateLimit.allowed) {
    return responseBody({ error: 'rate_limited', message: '提交过于频繁，请稍后再试。' }, 429, {
      'Retry-After': String(rateLimit.retryAfterSeconds),
    })
  }

  try {
    const id = await createPendingComment(articleSlug, nickname, content)
    return responseBody(
      {
        message: '评论已提交，审核通过后会公开展示。',
        data: { id, articleSlug, nickname, status: 'pending' },
      },
      201
    )
  } catch (error) {
    console.error('Failed to create pending article comment', error)
    return databaseErrorResponse()
  }
}
