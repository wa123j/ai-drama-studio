const TOKEN_KEY = 'ai_drama_token'
const USER_KEY = 'ai_drama_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn() {
  return !!getToken()
}

/**
 * 带认证的 fetch
 */
export async function authFetch(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...options, headers })
  return response
}

/**
 * 登录
 */
export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '登录失败')
  saveAuth(data.token, data.user)
  return data.user
}

/**
 * 注册
 */
export async function register(username, password) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '注册失败')
  saveAuth(data.token, data.user)
  return data.user
}

/**
 * 获取用户最新信息（刷新剩余额度等）
 */
export async function refreshUserInfo() {
  const res = await authFetch('/api/auth/me')
  if (!res.ok) {
    clearAuth()
    return null
  }
  const data = await res.json()
  if (data.success && data.user) {
    saveAuth(getToken(), data.user)
    return data.user
  }
  return null
}
