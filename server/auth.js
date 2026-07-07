import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'ai-drama-studio-default-secret-change-me'
const SALT_ROUNDS = 10

// 密码加密
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 密码验证
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// 生成 JWT token
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// 验证 JWT token（express 中间件）
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

// 管理员中间件
export function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: '无权限' })
  }
  next()
}
