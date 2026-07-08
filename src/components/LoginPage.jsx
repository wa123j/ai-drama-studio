import { useState } from 'react'
import { login, register } from '../utils/auth.js'

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = mode === 'login'
        ? await login(username, password)
        : await register(username, password)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-film flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🎬</div>
          <h1 className="text-3xl font-bold text-slate-800">AI短剧工坊</h1>
          <p className="text-slate-500 mt-2">智能生成爆款短剧剧本</p>
        </div>

        {/* 免费提示 */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 text-sm text-indigo-700">
          💡 新用户可免费生成 <strong>10集</strong> 剧本，无需任何付费即可体验
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {mode === 'login' ? '登录' : '注册'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              required
              minLength={2}
              maxLength={20}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              required
              minLength={4}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>

          <div className="mt-4 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>还没有账号？<button type="button" onClick={() => { setMode('register'); setError('') }} className="text-primary font-medium hover:underline">立即注册</button></>
            ) : (
              <>已有账号？<button type="button" onClick={() => { setMode('login'); setError('') }} className="text-primary font-medium hover:underline">去登录</button></>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
