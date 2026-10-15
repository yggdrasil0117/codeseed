-- CodeSeed comment storage schema.
-- Safe to run repeatedly: it does not drop or alter existing tables.

CREATE TABLE IF NOT EXISTS article_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_slug VARCHAR(255) NOT NULL,
  nickname VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_article_comments_status CHECK (status IN ('pending', 'approved', 'rejected')),
  INDEX idx_article_comments_article_status_created (
    article_slug,
    status,
    created_at,
    id
  ),
  INDEX idx_article_comments_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
