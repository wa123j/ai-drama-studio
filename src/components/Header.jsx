import { useState } from 'react'

export default function Header({ user, onHome, onHistory, onTopUp, onAdmin, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const remaining = user?.remainingEpisodes ?? 0

  const navLinks = [
    { label: '首页', onClick: onHome },
    { label: '📚 历史', onClick: onHistory },
  ]

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={onHome} className="flex items-center gap-2 text-xl font-bold text-slate-800 hover:text-primary transition shrink-0">
          <span className="text-2xl">🎬</span>
          <span>AI短剧<span className="text-primary">工坊</span></span>
        </button>

        {/* 桌面端导航 */}
        <nav className="hidden sm:flex items-center gap-3 text-sm">
          {navLinks.map(link => (
            <button key={link.label} onClick={link.onClick} className="text-slate-600 hover:text-primary transition">
              {link.label}
            </button>
          ))}

          {/* 额度 */}
          <span className={`px-3 py-1.5 rounded-lg font-medium text-xs ${
            remaining <= 3 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {remaining} 集
          </span>

          <button onClick={onTopUp} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition font-medium text-xs">
            💰 充值
          </button>

          {user?.isAdmin && (
            <button onClick={onAdmin} className="text-purple-600 hover:text-purple-800 transition text-xs font-medium">
              ⚙️ 管理
            </button>
          )}

          <span className="text-slate-400 text-xs hidden lg:inline">{user?.username}</span>
          <button onClick={onLogout} className="text-red-400 hover:text-red-600 transition text-xs">
            退出
          </button>
        </nav>

        {/* 手机端：右侧操作行 */}
        <div className="flex sm:hidden items-center gap-2">
          <span className={`px-2 py-1 rounded-lg font-medium text-xs ${
            remaining <= 3 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {remaining}集
          </span>
          <button onClick={onTopUp} className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-xs font-medium">
            💰
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-slate-600 hover:text-primary transition"
            aria-label="菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 手机端下拉菜单 */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 shadow-lg">
          <div className="px-4 py-3 space-y-2">
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={() => { link.onClick(); closeMenu() }}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 transition text-sm font-medium"
              >
                {link.label}
              </button>
            ))}
            {user?.isAdmin && (
              <button
                onClick={() => { onAdmin(); closeMenu() }}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-purple-600 hover:bg-purple-50 transition text-sm font-medium"
              >
                ⚙️ 管理后台
              </button>
            )}
            <div className="border-t border-slate-100 pt-2 mt-2">
              <div className="px-3 py-2 text-xs text-slate-400">
                {user?.username} · 剩余 {remaining} 集
              </div>
              <button
                onClick={() => { onLogout(); closeMenu() }}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition text-sm font-medium"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
