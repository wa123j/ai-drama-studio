export default function LoadingState({ phase, progress, failedEpisodes, onStop }) {
  // Phase 1: 正在生成框架
  if (phase === 'framework') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-3xl">🎬</span>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-3">AI正在构思剧本框架...</h3>
          <p className="text-slate-500 mb-2">正在生成标题、角色设定和分集梗概</p>
          <p className="text-sm text-slate-400 mb-8">大概需要 5~10 秒</p>

          {onStop && (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-xl hover:bg-red-100 transition font-medium"
            >
              <span>⏹</span>
              停止生成
            </button>
          )}
        </div>
      </div>
    )
  }

  // Phase 2: 逐集生成中
  if (phase === 'episodes' && progress) {
    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
    const failed = failedEpisodes?.length || 0
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">正在逐集生成详细内容...</h3>
          <p className="text-slate-500 mb-4">
            已完成 <span className="text-primary font-bold">{Math.max(0, progress.current - failed)}</span> / {progress.total} 集
            {failed > 0 && (
              <span className="text-amber-600 ml-2">（{failed} 集失败）</span>
            )}
          </p>

          {/* 进度条 */}
          <div className="w-full bg-slate-100 rounded-full h-3 mb-4 max-w-md mx-auto">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-sm text-slate-400 mb-2">
            正在生成第 {Math.min(progress.current + 1, progress.total)} 集...
          </p>
          <p className="text-xs text-slate-400">
            您可以先浏览下方已生成的内容
          </p>
        </div>
      </div>
    )
  }

  // 旧用法兼容
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-3xl">🎬</span>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-3">AI正在创作中...</h3>
        <p className="text-slate-500 mb-8">正在为您生成完整的短剧剧本，请稍候</p>

        {onStop && (
          <button
            onClick={onStop}
            className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-6 py-3 rounded-xl hover:bg-red-100 transition font-medium"
          >
            <span>⏹</span>
            停止生成
          </button>
        )}
      </div>
    </div>
  )
}
