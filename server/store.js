import fs from 'fs'
import initSqlJs from 'sql.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DATA_DIR, 'app.db')

let db = null

async function getDb() {
  if (db) return db

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  })

  // 如果已有数据库文件，加载它
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 建表
  db.run(`
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

  saveDb()
  return db
}

function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
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
  await getDb()
  return rowToUser(queryOne('SELECT * FROM users WHERE username = ?', [username]))
}

export async function findById(id) {
  await getDb()
  return rowToUser(queryOne('SELECT * FROM users WHERE id = ?', [id]))
}

export async function createUser({ username, passwordHash, isAdmin = false }) {
  await getDb()
  const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  db.run(
    'INSERT INTO users (id, username, password_hash, is_admin, total_episodes, paid_extra_episodes, created_at) VALUES (?, ?, ?, ?, 0, 0, datetime(\'now\'))',
    [id, username, passwordHash, isAdmin ? 1 : 0]
  )
  saveDb()
  return findById(id)
}

export async function incrementEpisodes(id, count = 1) {
  await getDb()
  db.run('UPDATE users SET total_episodes = total_episodes + ? WHERE id = ?', [count, id])
  saveDb()
  return true
}

export async function addPaidEpisodes(id, extraCount) {
  await getDb()
  db.run('UPDATE users SET paid_extra_episodes = paid_extra_episodes + ? WHERE id = ?', [extraCount, id])
  saveDb()
  return true
}

export function getRemainingEpisodes(user) {
  const freeLimit = 10
  const used = user.totalEpisodes
  const paid = user.paidExtraEpisodes
  return Math.max(0, freeLimit + paid - used)
}

export async function getAllUsers() {
  await getDb()
  const rows = queryAll('SELECT * FROM users ORDER BY created_at DESC')
  return rows.map(rowToUser)
}
