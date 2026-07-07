import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildFrameworkSystemPrompt,
  buildFrameworkUserPrompt,
  buildEpisodeSystemPrompt,
  buildEpisodeUserPrompt
} from './prompt.js'
import { authMiddleware, adminMiddleware, hashPassword, verifyPassword, generateToken } from './auth.js'
import { findByUsername, findById, createUser, incrementEpisodes, addPaidEpisodes, getRemainingEpisodes, getAllUsers } from './store.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

// ========================================
// 静态文件（前端构建产物）
// ========================================
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// ========================================
// 工具函数
// ========================================
function extractText(content) {
  for (const block of content) {
    if (block.type === 'text') return block.text
  }
  return content[0]?.text || ''
}

function checkApiKey() {
  return process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY !== 'your-api-key-here'
}

// ========================================
// 认证路由
// ========================================

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' })
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度2-20个字符' })
    }
    if (password.length < 4) {
      return res.status(400).json({ error: '密码至少4位' })
    }

    const existing = await findByUsername(username)
    if (existing) {
      return res.status(400).json({ error: '用户名已存在' })
    }

    const passwordHash = await hashPassword(password)
    // 第一个注册用户自动成为管理员
    const isAdmin = await findByUsername('admin') === null && username === 'admin'
    const user = await createUser({ username, passwordHash, isAdmin })

    const token = generateToken(user)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        totalEpisodes: user.totalEpisodes,
        paidExtraEpisodes: user.paidExtraEpisodes,
        remainingEpisodes: getRemainingEpisodes(user)
      }
    })
  } catch (error) {
    console.error('注册失败:', error)
    res.status(500).json({ error: '注册失败' })
  }
})

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' })
    }

    const user = await findByUsername(username)
    if (!user) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    const token = generateToken(user)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        totalEpisodes: user.totalEpisodes,
        paidExtraEpisodes: user.paidExtraEpisodes,
        remainingEpisodes: getRemainingEpisodes(user)
      }
    })
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ error: '登录失败' })
  }
})

// 获取当前用户信息
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = await findById(req.user.id)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      totalEpisodes: user.totalEpisodes,
      paidExtraEpisodes: user.paidExtraEpisodes,
      remainingEpisodes: getRemainingEpisodes(user)
    }
  })
})

// ========================================
// 管理员路由
// ========================================

// 管理员给用户加额度
app.post('/api/admin/add-episodes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, extraCount } = req.body
    if (!username || !extraCount || extraCount < 1) {
      return res.status(400).json({ error: '参数错误' })
    }

    const user = await findByUsername(username)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    await addPaidEpisodes(user.id, extraCount)
    res.json({ success: true, message: `已为 ${username} 增加 ${extraCount} 集额度` })
  } catch (error) {
    console.error('加额度失败:', error)
    res.status(500).json({ error: '操作失败' })
  }
})

// 管理员获取用户列表
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const users = await getAllUsers()
  const list = users.map(u => ({
    id: u.id,
    username: u.username,
    isAdmin: u.isAdmin,
    totalEpisodes: u.totalEpisodes,
    paidExtraEpisodes: u.paidExtraEpisodes,
    remainingEpisodes: getRemainingEpisodes(u),
    createdAt: u.createdAt
  }))
  res.json({ success: true, users: list })
})

// ========================================
// 生成接口（需要登录）
// ========================================

// 一次性生成（需要登录 + 扣总额度）
app.post('/api/generate', authMiddleware, async (req, res) => {
  try {
    const { genre, theme, episodes, protagonist, extras } = req.body

    if (!genre || !theme || !episodes) {
      return res.status(400).json({ error: '请填写必填字段（类型、主题、集数）' })
    }

    if (!checkApiKey()) {
      return res.status(400).json({ error: '请先配置CLAUDE_API_KEY环境变量' })
    }

    // 检查并扣除额度
    const episodeCount = parseInt(episodes) || 10
    const user = await findById(req.user.id)
    if (!user) return res.status(404).json({ error: '用户不存在' })
    const remaining = getRemainingEpisodes(user)
    if (remaining < episodeCount) {
      return res.status(403).json({ error: `额度不足，需要 ${episodeCount} 集，剩余 ${Math.max(0, remaining)} 集`, remainingEpisodes: Math.max(0, remaining), needPayment: true })
    }
    await incrementEpisodes(req.user.id, episodeCount)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-5-20251001',
      max_tokens: 32000,
      system: buildSystemPrompt(),
      messages: [{
        role: 'user',
        content: buildUserPrompt({ genre, theme, episodes, protagonist, extras })
      }],
      stream: true
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(chunk.delta.text)
      }
    }

    res.end()
  } catch (error) {
    console.error('生成失败:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: '生成失败：' + (error.message || '未知错误') })
    } else {
      res.end()
    }
  }
})

// 生成框架（需要登录 + 扣总额度）
app.post('/api/generate/framework', authMiddleware, async (req, res) => {
  try {
    const { genre, theme, episodes, protagonist, extras } = req.body

    if (!genre || !theme || !episodes) {
      return res.status(400).json({ error: '请填写必填字段（类型、主题、集数）' })
    }

    if (!checkApiKey()) {
      return res.status(400).json({ error: '请先配置CLAUDE_API_KEY环境变量' })
    }

    // 检查并扣除总额度（逐集生成不再扣费）
    const episodeCount = parseInt(episodes) || 10
    const user = await findById(req.user.id)
    if (!user) return res.status(404).json({ error: '用户不存在' })
    const remaining = getRemainingEpisodes(user)
    if (remaining < episodeCount) {
      return res.status(403).json({ error: `额度不足，需要 ${episodeCount} 集，剩余 ${Math.max(0, remaining)} 集`, remainingEpisodes: Math.max(0, remaining), needPayment: true })
    }
    await incrementEpisodes(req.user.id, episodeCount)

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-5-20251001',
      max_tokens: 4000,
      system: buildFrameworkSystemPrompt(),
      messages: [{
        role: 'user',
        content: buildFrameworkUserPrompt({ genre, theme, episodes, protagonist, extras })
      }]
    })

    const text = extractText(msg.content)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI返回格式异常，请重试' })
    }

    const data = JSON.parse(jsonMatch[0])
    if (data.episodes) {
      data.episodes.forEach((ep, i) => {
        ep.number = ep.number || i + 1
      })
    }

    res.json({ success: true, data })
  } catch (error) {
    console.error('生成框架失败:', error)
    res.status(500).json({ error: '生成框架失败：' + (error.message || '未知错误') })
  }
})

// 生成单集（只需登录，额度已在框架接口扣除）
app.post('/api/generate/episode', authMiddleware, async (req, res) => {
  try {
    const { framework, episodeNumber, totalEpisodes } = req.body

    if (!framework || !episodeNumber) {
      return res.status(400).json({ error: '缺少必填参数' })
    }

    if (!checkApiKey()) {
      return res.status(400).json({ error: '请先配置CLAUDE_API_KEY环境变量' })
    }

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-5-20251001',
      max_tokens: 4000,
      system: buildEpisodeSystemPrompt(),
      messages: [{
        role: 'user',
        content: buildEpisodeUserPrompt(framework, episodeNumber, totalEpisodes || framework.episodes?.length)
      }]
    })

    const text = extractText(msg.content)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI返回格式异常，请重试' })
    }

    const data = JSON.parse(jsonMatch[0])
    data.number = data.number || episodeNumber
    data.title = data.title || ''

    res.json({ success: true, data })
  } catch (error) {
    console.error('生成单集失败:', error)
    res.status(500).json({ error: `生成第${req.body.episodeNumber}集失败：` + (error.message || '未知错误') })
  }
})

// ========================================
// 前端路由回退（SPA）
// ========================================
// 前端路由回退（SPA）- 仅非API路径
app.get('/{*path}', (req, res) => {
  if (req.params.path && req.params.path.startsWith('api/')) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.sendFile(path.join(distPath, 'index.html'))
})

// ========================================
// 启动服务
// ========================================
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`AI短剧工坊 API 服务运行在 http://localhost:${PORT}`)
})
