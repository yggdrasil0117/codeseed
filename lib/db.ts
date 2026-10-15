import 'server-only'

import mysql, { type Pool } from 'mysql2/promise'

let pool: Pool | undefined

export class DatabaseConfigError extends Error {
  constructor(message = 'MySQL database configuration is incomplete') {
    super(message)
    this.name = 'DatabaseConfigError'
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new DatabaseConfigError(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getDbPool() {
  if (pool) return pool

  const port = Number(process.env.MYSQL_PORT || 3306)
  const connectionLimit = Number(process.env.MYSQL_CONNECTION_LIMIT || 10)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new DatabaseConfigError('MYSQL_PORT must be a valid TCP port')
  }
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100) {
    throw new DatabaseConfigError('MYSQL_CONNECTION_LIMIT must be between 1 and 100')
  }

  pool = mysql.createPool({
    host: requiredEnv('MYSQL_HOST'),
    port,
    user: requiredEnv('MYSQL_USER'),
    password: process.env.MYSQL_PASSWORD || '',
    database: requiredEnv('MYSQL_DATABASE'),
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    connectTimeout: 5000,
    enableKeepAlive: true,
    charset: 'utf8mb4',
    dateStrings: true,
  })

  return pool
}
