import { useState, useEffect, useCallback } from 'react'
import { authFetch, refreshUserInfo } from '../utils/auth.js'

export default function AdminPage({ user, onLogout }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [targetUsername, setTargetUsername] = useState('')
  const [extraCount, setExtraCount] = useState(50)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' | 'error'

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

  const handleAddEpisodes = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const res = await authFetch('/api/admin/add-episodes', {
        method: 'POST',
        body: JSON.stringify({ username: targetUsername, extraCount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')
      setMessage(data.message || '成功')
      setMessageType('success')
      loadUsers()
    } catch (err) {
      setMessage(err.message)
      setMessageType('error')
    }
  }

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

        {/* 加额度表单 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
          <h2 className="font-bold text-slate-800 mb-4">手动增加额度</h2>
          <form onSubmit={handleAddEpisodes} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
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
            <div className="w-32">
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
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition"
            >
              确认充值
            </button>
          </form>
          {message && (
            <div className={`mt-3 text-sm ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </div>
          )}
        </div>

        {/* 用户列表 */}
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
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left p-4 font-medium">用户名</th>
                    <th className="text-left p-4 font-medium">已用</th>
                    <th className="text-left p-4 font-medium">已购</th>
                    <th className="text-left p-4 font-medium">剩余</th>
                    <th className="text-left p-4 font-medium">角色</th>
                    <th className="text-left p-4 font-medium">注册时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-800">{u.username}</td>
                      <td className="p-4 text-slate-600">{u.totalEpisodes}</td>
                      <td className="p-4 text-slate-600">{u.paidExtraEpisodes}</td>
                      <td className="p-4">
                        <span className={`font-medium ${u.remainingEpisodes <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {u.remainingEpisodes}
                        </span>
                      </td>
                      <td className="p-4">{u.isAdmin ? <span className="text-primary text-xs font-bold">管理员</span> : <span className="text-slate-400">用户</span>}</td>
                      <td className="p-4 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
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
