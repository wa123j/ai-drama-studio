import fs from 'fs'
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

// 数据库优先级：Railway PostgreSQL > Turso > 本地 SQLite
const DATABASE_URL = process.env.DATABASE_URL
const TURSO_DB_URL = process.env.TURSO_DB_URL
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN

let db

async function getDb() {
  if (db) return db

  if (DATABASE_URL) {
    console.log('[DB] 尝试连接 Railway PostgreSQL...')
    try {
      const { default: pg } = await import('pg')
      const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
      await pool.query('SELECT 1')
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          total_episodes INTEGER DEFAULT 0,
          paid_extra_episodes INTEGER DEFAULT 0,
          is_admin INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `)
      console.log('[DB] PostgreSQL 连接成功')
      db = { _type: 'pg', pool }
    } catch (pgErr) {
      console.error('[DB] PostgreSQL 连接失败，回退到本地 SQLite:', pgErr.message)
    }
  } else if (TURSO_DB_URL && TURSO_DB_TOKEN) {
    console.log('[DB] 使用 Turso 远程数据库')
    db = createClient({ url: TURSO_DB_URL, authToken: TURSO_DB_TOKEN })
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        total_episodes INTEGER DEFAULT 0,
        paid_extra_episodes INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
  } else {
    console.log('[DB] 使用本地 SQLite')
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    db = createClient({ url: `file:${path.join(DATA_DIR, 'app.db')}` })
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        total_episodes INTEGER DEFAULT 0,
        paid_extra_episodes INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
  }

  return db
}

function rowToUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    totalEpisodes: Number(row.total_episodes ?? 0),
    paidExtraEpisodes: Number(row.paid_extra_episodes ?? 0),
    isAdmin: !!row.is_admin,
    createdAt: row.created_at
  }
}

async function query(sql, args = []) {
  const conn = await getDb()
  if (conn._type === 'pg') {
    // PostgreSQL: 用 $1, $2 参数化查询
    let idx = 0
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`)
    const result = await conn.pool.query(pgSql, args)
    return result.rows
  } else {
    // SQLite: 用 ? 参数化查询
    const result = await conn.execute({ sql, args })
    return result.rows
  }
}

async function run(sql, args = []) {
  const conn = await getDb()
  if (conn._type === 'pg') {
    let idx = 0
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`)
    await conn.pool.query(pgSql, args)
  } else {
    await conn.execute({ sql, args })
  }
}

export async function findByUsername(username) {
  return rowToUser((await query('SELECT * FROM users WHERE username = ?', [username]))[0])
}

export async function findById(id) {
  return rowToUser((await query('SELECT * FROM users WHERE id = ?', [id]))[0])
}

export async function createUser({ username, passwordHash, isAdmin = false }) {
  const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  if ((await getDb())._type === 'pg') {
    await run(
      "INSERT INTO users (id, username, password_hash, is_admin, total_episodes, paid_extra_episodes, created_at) VALUES (?, ?, ?, ?, 0, 0, NOW())",
      [id, username, passwordHash, isAdmin ? 1 : 0]
    )
  } else {
    await run(
      "INSERT INTO users (id, username, password_hash, is_admin, total_episodes, paid_extra_episodes, created_at) VALUES (?, ?, ?, ?, 0, 0, datetime('now'))",
      [id, username, passwordHash, isAdmin ? 1 : 0]
    )
  }
  return findById(id)
}

export async function incrementEpisodes(id, count = 1) {
  await run('UPDATE users SET total_episodes = total_episodes + ? WHERE id = ?', [count, id])
  return true
}

export async function addPaidEpisodes(id, extraCount) {
  await run('UPDATE users SET paid_extra_episodes = paid_extra_episodes + ? WHERE id = ?', [extraCount, id])
  return true
}

export function getRemainingEpisodes(user) {
  return Math.max(0, 10 + (user.paidExtraEpisodes || 0) - (user.totalEpisodes || 0))
}

export async function getAllUsers() {
  return (await query('SELECT * FROM users ORDER BY created_at DESC')).map(rowToUser)
}
