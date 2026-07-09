import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildFrameworkSystemPrompt,
  buildFrameworkUserPrompt,
  buildEpisodeSystemPrompt,
  buildEpisodeUserPrompt
} from './prompt.js'
import { authMiddleware, adminMiddleware, hashPassword, verifyPassword, generateToken } from './auth.js'
import { findByUsername, findById, createUser, incrementEpisodes, addPaidEpisodes, reduceRemainingEpisodes, deleteUser, getRemainingEpisodes, getAllUsers } from './store.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 防重复扣费：记录已扣费的 (userId + framework.title + episodeNumber)
const chargedSet = new Set()
setInterval(() => chargedSet.clear(), 1000 * 60 * 30) // 每30分钟清空一次，防止内存泄漏

app.use(cors())
app.use(express.json())

// DeepSeek 客户端（兼容 OpenAI SDK）
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.CLAUDE_API_KEY
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

const deepseek = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
})

// ========================================
// 静态文件（前端构建产物）
// ========================================
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// ========================================
// 工具函数
// ========================================
function extractText(completion) {
  return completion.choices?.[0]?.message?.content || ''
}

function checkApiKey() {
  return DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'your-api-key-here' && DEEPSEEK_API_KEY !== 'sk-your-deepseek-key'
}

/**
 * 通用的 DeepSeek 流式调用（一次性生成用）
 */
async function* streamDeepSeek(systemPrompt, userPrompt) {
  const stream = await deepseek.chat.completions.create({
    model: DEEPSEEK_MODEL,
    max_tokens: 32000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    stream: true
  })

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content
    if (content) {
      yield content
    }
  }
}

/**
 * 通用的 DeepSeek 非流式调用（框架/单集生成用）
 */
async function callDeepSeek(systemPrompt, userPrompt, maxTokens = 4000) {
  const completion = await deepseek.chat.completions.create({
    model: DEEPSEEK_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  })

  return extractText(completion)
}

// ========================================
// 认证路由
// ========================================

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
    res.status(500).json({ error: '注册失败: ' + (error.message || '未知错误') })
  }
})

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
    res.status(500).json({ error: '登录失败: ' + (error.message || '未知错误') })
  }
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('获取用户信息失败:', err)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

// ========================================
// 管理员路由
// ========================================

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

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('获取用户列表失败:', err)
    res.status(500).json({ error: '获取用户列表失败' })
  }
})

// 减少用户剩余集数
app.post('/api/admin/reduce-episodes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username, count } = req.body
    if (!username || !count || count < 1) {
      return res.status(400).json({ error: '参数错误' })
    }

    const user = await findByUsername(username)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const remaining = getRemainingEpisodes(user)
    const actualReduce = Math.min(count, Math.max(0, remaining))
    await reduceRemainingEpisodes(user.id, actualReduce)
    res.json({ success: true, message: `已减少 ${username} 的剩余额度 ${actualReduce} 集` })
  } catch (error) {
    console.error('减额度失败:', error)
    res.status(500).json({ error: '操作失败' })
  }
})

// 删除用户
app.post('/api/admin/delete-user', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { username } = req.body
    if (!username) {
      return res.status(400).json({ error: '缺少用户名' })
    }

    const user = await findByUsername(username)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    if (user.isAdmin) {
      return res.status(400).json({ error: '不能删除管理员账号' })
    }

    await deleteUser(user.id)
    res.json({ success: true, message: `已删除用户 ${username}` })
  } catch (error) {
    console.error('删除用户失败:', error)
    res.status(500).json({ error: '操作失败' })
  }
})

// ========================================
// 生成接口（需要登录）
// ========================================

// 一次性生成（流式输出）
app.post('/api/generate', authMiddleware, async (req, res) => {
  try {
    const { genre, theme, episodes, protagonist, extras } = req.body

    if (!genre || !theme || !episodes) {
      return res.status(400).json({ error: '请填写必填字段（类型、主题、集数）' })
    }

    if (!checkApiKey()) {
      return res.status(400).json({ error: '请先配置 DEEPSEEK_API_KEY 环境变量' })
    }

    const episodeCount = parseInt(episodes) || 10
    const user = await findById(req.user.id)
    if (!user) return res.status(404).json({ error: '用户不存在' })
    const remaining = getRemainingEpisodes(user)
    if (remaining < episodeCount) {
      return res.status(403).json({ error: `额度不足，需要 ${episodeCount} 集，剩余 ${Math.max(0, remaining)} 集`, remainingEpisodes: Math.max(0, remaining), needPayment: true })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt({ genre, theme, episodes, protagonist, extras })

    const stream = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      max_tokens: 32000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        res.write(content)
      }
    }

    res.end()
    // 流式传输完成后再扣费
    incrementEpisodes(req.user.id, episodeCount).catch(e => console.error('扣费失败:', e))
  } catch (error) {
    console.error('生成失败:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: '生成失败：' + (error.message || '未知错误') })
    } else {
      res.end()
    }
  }
})

// 生成框架
app.post('/api/generate/framework', authMiddleware, async (req, res) => {
  try {
    const { genre, theme, episodes, protagonist, extras } = req.body

    if (!genre || !theme || !episodes) {
      return res.status(400).json({ error: '请填写必填字段（类型、主题、集数）' })
    }

    if (!checkApiKey()) {
      return res.status(400).json({ error: '请先配置 DEEPSEEK_API_KEY 环境变量' })
    }

    const episodeCount = parseInt(episodes) || 10
    const user = await findById(req.user.id)
    if (!user) return res.status(404).json({ error: '用户不存在' })
    const remaining = getRemainingEpisodes(user)
    if (remaining < episodeCount) {
      return res.status(403).json({ error: `额度不足，需要 ${episodeCount} 集，剩余 ${Math.max(0, remaining)} 集`, remainingEpisodes: Math.max(0, remaining), needPayment: true })
    }

    const text = await callDeepSeek(
      buildFrameworkSystemPrompt(),
      buildFrameworkUserPrompt({ genre, theme, episodes, protagonist, extras })
    )

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

// 生成单集
app.post('/api/generate/episode', authMiddleware, async (req, res) => {
  try {
    const { framework, episodeNumber, totalEpisodes } = req.body

    if (!framework || !episodeNumber) {
      return res.status(400).json({ error: '缺少必填参数' })
    }

    if (!checkApiKey()) {
      return res.status(400).json({ error: '请先配置 DEEPSEEK_API_KEY 环境变量' })
    }

    // 先检查额度够不够，但不扣
    const user = await findById(req.user.id)
    if (!user) return res.status(404).json({ error: '用户不存在' })
    const remaining = getRemainingEpisodes(user)
    if (remaining < 1) {
      return res.status(403).json({ error: '额度不足，请充值', remainingEpisodes: 0, needPayment: true })
    }

    // 防重复扣费检查：同一用户 + 同一剧本 + 同一集号，只扣一次
    const dedupKey = `${req.user.id}:${framework.title}:${episodeNumber}`
    const alreadyCharged = chargedSet.has(dedupKey)

    const text = await callDeepSeek(
      buildEpisodeSystemPrompt(),
      buildEpisodeUserPrompt(framework, episodeNumber, totalEpisodes || framework.episodes?.length)
    )

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI返回格式异常，请重试' })
    }

    const data = JSON.parse(jsonMatch[0])
    data.number = data.number || episodeNumber
    data.title = data.title || ''

    // 先返回结果给前端，再扣费——避免用户刷新时扣了费但没拿到结果
    res.json({ success: true, data })
    if (!alreadyCharged) {
      chargedSet.add(dedupKey)
      incrementEpisodes(req.user.id, 1).catch(e => console.error('扣费失败:', e))
    }
  } catch (error) {
    console.error('生成单集失败:', error)
    res.status(500).json({ error: `生成第${req.body.episodeNumber}集失败：` + (error.message || '未知错误') })
  }
})

// ========================================
// 前端路由回退（SPA）
// ========================================
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

process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('未捕获的Promise拒绝:', reason)
})

app.listen(PORT, () => {
  console.log(`AI短剧工坊 API 服务运行在 http://localhost:${PORT}`)
})
