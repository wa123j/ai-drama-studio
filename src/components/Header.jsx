export default function Header({ user, onHome, onHistory, onTopUp, onAdmin, onLogout }) {
  const remaining = user?.remainingEpisodes ?? 0

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2 text-xl font-bold text-slate-800 hover:text-primary transition">
          <span className="text-2xl">🎬</span>
          <span>AI短剧<span className="text-primary">工坊</span></span>
        </button>
        <nav className="flex items-center gap-4 text-sm">
          <button onClick={onHome} className="text-slate-600 hover:text-primary transition">首页</button>
          <button onClick={onHistory} className="text-slate-600 hover:text-primary transition">📚 历史</button>

          {/* 额度显示 */}
          <span className={`px-3 py-1.5 rounded-lg font-medium text-xs ${
            remaining <= 3 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {remaining} 集
          </span>

          <button onClick={onTopUp} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition font-medium text-xs">
            💰 充值
          </button>

          {/* 管理员入口 */}
          {user?.isAdmin && (
            <button onClick={onAdmin} className="text-purple-600 hover:text-purple-800 transition text-xs font-medium">
              ⚙️ 管理
            </button>
          )}

          {/* 用户信息 */}
          <span className="text-slate-400 text-xs">{user?.username}</span>
          <button onClick={onLogout} className="text-red-400 hover:text-red-600 transition text-xs">
            退出
          </button>
        </nav>
      </div>
    </header>
  )
}
