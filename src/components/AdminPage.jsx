import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../utils/auth.js'

export default function AdminPage({ user, onLogout }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // 增加额度表单
  const [targetUsername, setTargetUsername] = useState('')
  const [extraCount, setExtraCount] = useState(50)

  // 减少剩余集数表单
  const [deductUsername, setDeductUsername] = useState('')
  const [deductCount, setDeductCount] = useState(1)

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const loadUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/users')
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      if (data.success) setUsers(data.users)
    } catch (err) {
      setMessage(err.message)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const showMsg = (text, type) => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleAddEpisodes = async (e) => {
    e.preventDefault()
    try {
      const res = await authFetch('/api/admin/add-episodes', {
        method: 'POST',
        body: JSON.stringify({ username: targetUsername, extraCount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')
      showMsg(data.message || '成功', 'success')
      loadUsers()
    } catch (err) {
      showMsg(err.message, 'error')
    }
  }

  const handleReduceEpisodes = async (e) => {
    e.preventDefault()
    try {
      const res = await authFetch('/api/admin/reduce-episodes', {
        method: 'POST',
        body: JSON.stringify({ username: deductUsername, count: deductCount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')
      showMsg(data.message || '成功', 'success')
      loadUsers()
    } catch (err) {
      showMsg(err.message, 'error')
    }
  }

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`确定要删除用户「${username}」吗？此操作不可恢复！`)) return

    try {
      const res = await authFetch('/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ username })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')
      showMsg(data.message || '已删除', 'success')
      loadUsers()
    } catch (err) {
      showMsg(err.message, 'error')
    }
  }

  const currentUser = (row) => row.username === user?.username

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">管理后台</h1>
            <p className="text-slate-500 text-sm mt-1">管理员：{user?.username}</p>
          </div>
          <button onClick={onLogout} className="text-sm text-red-500 hover:text-red-700 px-4 py-2 border border-red-200 rounded-lg">
            退出登录
          </button>
        </div>

        {/* ===== 增加额度 ===== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm mb-4 sm:mb-6">
          <h2 className="font-bold text-slate-800 mb-4 text-base sm:text-lg">➕ 增加额度</h2>
          <form onSubmit={handleAddEpisodes} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm text-slate-600 mb-1">用户名</label>
              <input
                type="text"
                value={targetUsername}
                onChange={e => setTargetUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
                list="usernames"
              />
              <datalist id="usernames">
                {users.map(u => <option key={u.id} value={u.username} />)}
              </datalist>
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-sm text-slate-600 mb-1">增加集数</label>
              <input
                type="number"
                value={extraCount}
                onChange={e => setExtraCount(Number(e.target.value))}
                min={1}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition sm:w-auto"
            >
              确认充值
            </button>
          </form>
        </div>

        {/* ===== 减少剩余集数 ===== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm mb-4 sm:mb-6">
          <h2 className="font-bold text-slate-800 mb-4 text-base sm:text-lg">➖ 减少剩余集数</h2>
          <p className="text-xs text-slate-400 mb-3">例如用户还剩20集，减少5集后剩余15集</p>
          <form onSubmit={handleReduceEpisodes} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm text-slate-600 mb-1">用户名</label>
              <input
                type="text"
                value={deductUsername}
                onChange={e => setDeductUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
                list="usernames"
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="block text-sm text-slate-600 mb-1">减少集数</label>
              <input
                type="number"
                value={deductCount}
                onChange={e => setDeductCount(Number(e.target.value))}
                min={1}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-amber-600 transition sm:w-auto"
            >
              确认减少
            </button>
          </form>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* ===== 用户列表 ===== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">用户列表</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-400">加载中...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400">暂无用户</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-2 sm:p-4 font-medium">用户名</th>
                    <th className="text-left p-2 sm:p-4 font-medium">已用</th>
                    <th className="text-left p-2 sm:p-4 font-medium">已购</th>
                    <th className="text-left p-2 sm:p-4 font-medium">剩余</th>
                    <th className="text-left p-2 sm:p-4 font-medium hidden sm:table-cell">角色</th>
                    <th className="text-left p-2 sm:p-4 font-medium hidden sm:table-cell">注册时间</th>
                    <th className="text-left p-2 sm:p-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-2 sm:p-4 font-medium text-slate-800">
                        <div className="truncate max-w-[80px] sm:max-w-none">{u.username}</div>
                        {currentUser(u) && <span className="ml-1 text-xs text-primary hidden sm:inline">（你）</span>}
                      </td>
                      <td className="p-2 sm:p-4 text-slate-600">{u.totalEpisodes}</td>
                      <td className="p-2 sm:p-4 text-slate-600">{u.paidExtraEpisodes}</td>
                      <td className="p-2 sm:p-4">
                        <span className={`font-medium ${u.remainingEpisodes <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {u.remainingEpisodes}
                        </span>
                      </td>
                      <td className="p-2 sm:p-4 hidden sm:table-cell">
                        {u.isAdmin
                          ? <span className="text-primary text-xs font-bold">管理员</span>
                          : <span className="text-slate-400">用户</span>
                        }
                      </td>
                      <td className="p-2 sm:p-4 text-slate-400 text-xs hidden sm:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-2 sm:p-4">
                        {!u.isAdmin && (
                          <button
                            onClick={() => handleDeleteUser(u.username)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium transition"
                          >
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
