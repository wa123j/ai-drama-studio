import fs from 'fs'
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

// Railway 上用远程 Turso 数据库，本地开发用 SQLite 文件
const TURSO_DB_URL = process.env.TURSO_DB_URL
const TURSO_DB_TOKEN = process.env.TURSO_DB_TOKEN

let db

async function getDb() {
  if (db) return db

  if (TURSO_DB_URL && TURSO_DB_TOKEN) {
    db = createClient({
      url: TURSO_DB_URL,
      authToken: TURSO_DB_TOKEN
    })
  } else {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    db = createClient({
      url: `file:${path.join(DATA_DIR, 'app.db')}`
    })
  }

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

  return db
}

function rowToUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    totalEpisodes: row.total_episodes,
    paidExtraEpisodes: row.paid_extra_episodes,
    isAdmin: !!row.is_admin,
    createdAt: row.created_at
  }
}

export async function findByUsername(username) {
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] })
  return rowToUser(result.rows[0])
}

export async function findById(id) {
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] })
  return rowToUser(result.rows[0])
}

export async function createUser({ username, passwordHash, isAdmin = false }) {
  const db = await getDb()
  const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  await db.execute({
    sql: "INSERT INTO users (id, username, password_hash, is_admin, total_episodes, paid_extra_episodes, created_at) VALUES (?, ?, ?, ?, 0, 0, datetime('now'))",
    args: [id, username, passwordHash, isAdmin ? 1 : 0]
  })
  return findById(id)
}

export async function incrementEpisodes(id, count = 1) {
  const db = await getDb()
  await db.execute({
    sql: 'UPDATE users SET total_episodes = total_episodes + ? WHERE id = ?',
    args: [count, id]
  })
  return true
}

export async function addPaidEpisodes(id, extraCount) {
  const db = await getDb()
  await db.execute({
    sql: 'UPDATE users SET paid_extra_episodes = paid_extra_episodes + ? WHERE id = ?',
    args: [extraCount, id]
  })
  return true
}

export function getRemainingEpisodes(user) {
  const freeLimit = 10
  const used = user.totalEpisodes
  const paid = user.paidExtraEpisodes
  return Math.max(0, freeLimit + paid - used)
}

export async function getAllUsers() {
  const db = await getDb()
  const result = await db.execute('SELECT * FROM users ORDER BY created_at DESC')
  return result.rows.map(rowToUser)
}
