import 'server-only'

import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { getDbPool } from './db'

interface CommentRow extends RowDataPacket {
  id: number
  article_slug: string
  nickname: string
  content: string
  created_at: string
}

interface CountRow extends RowDataPacket {
  total: number
}

export interface PublicComment {
  id: number
  articleSlug: string
  nickname: string
  content: string
  createdAt: string
}

function toPublicComment(row: CommentRow): PublicComment {
  return {
    id: row.id,
    articleSlug: row.article_slug,
    nickname: row.nickname,
    content: row.content,
    createdAt: row.created_at,
  }
}

export async function listApprovedComments(articleSlug: string, limit: number, offset: number) {
  const pool = getDbPool()
  const [rows] = await pool.execute<CommentRow[]>(
    `SELECT id, article_slug, nickname, content, created_at
     FROM article_comments
     WHERE article_slug = ? AND status = 'approved'
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [articleSlug, limit, offset]
  )
  const [countRows] = await pool.execute<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM article_comments
     WHERE article_slug = ? AND status = 'approved'`,
    [articleSlug]
  )

  return {
    comments: rows.map(toPublicComment),
    total: Number(countRows[0]?.total || 0),
  }
}

export async function createPendingComment(articleSlug: string, nickname: string, content: string) {
  const pool = getDbPool()
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO article_comments (article_slug, nickname, content, status)
     VALUES (?, ?, ?, 'pending')`,
    [articleSlug, nickname, content]
  )
  return result.insertId
}
