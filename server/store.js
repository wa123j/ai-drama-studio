import fs from 'fs'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'app.db')

let db

function getDb() {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')

    db.exec(`
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

export function findByUsername(username) {
  const row = getDb().prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!row) return null
  return rowToUser(row)
}

export function findById(id) {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!row) return null
  return rowToUser(row)
}

export function createUser({ username, passwordHash, isAdmin = false }) {
  const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  getDb().prepare(`
    INSERT INTO users (id, username, password_hash, is_admin, total_episodes, paid_extra_episodes, created_at)
    VALUES (?, ?, ?, ?, 0, 0, datetime('now'))
  `).run(id, username, passwordHash, isAdmin ? 1 : 0)

  return findById(id)
}

export function incrementEpisodes(id, count = 1) {
  const result = getDb().prepare('UPDATE users SET total_episodes = total_episodes + ? WHERE id = ?').run(count, id)
  return result.changes > 0
}

export function addPaidEpisodes(id, extraCount) {
  const result = getDb().prepare('UPDATE users SET paid_extra_episodes = paid_extra_episodes + ? WHERE id = ?').run(extraCount, id)
  return result.changes > 0
}

export function getRemainingEpisodes(user) {
  const freeLimit = 10
  const used = user.totalEpisodes
  const paid = user.paidExtraEpisodes
  return Math.max(0, freeLimit + paid - used)
}

// 管理员用：用户列表
export function getAllUsers() {
  const rows = getDb().prepare('SELECT * FROM users ORDER BY created_at DESC').all()
  return rows.map(rowToUser)
}

function rowToUser(row) {
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
