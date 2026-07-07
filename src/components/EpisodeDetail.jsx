export default function EpisodeDetail({ episode, isFailed }) {
  const hasContent = episode.content && episode.content.length > 20

  if (isFailed) {
    return (
      <div className="px-5 pb-5 border-t border-slate-100 pt-4">
        <div className="bg-red-50 border border-red-100 rounded-lg p-6 text-center">
          <p className="text-sm text-red-600 font-medium">⚠️ 该集生成失败</p>
          <p className="text-xs text-red-400 mt-1">可能是超时或网络波动，请重新生成</p>
        </div>
      </div>
    )
  }

  if (!hasContent) {
    return (
      <div className="px-5 pb-5 border-t border-slate-100 pt-4">
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">正在生成详细剧本...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pb-5 border-t border-slate-100 pt-4">
      {episode.scene && (
        <div className="mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">场景</span>
          <p className="text-sm text-slate-600 mt-1 bg-slate-50 rounded-lg p-3">{episode.scene}</p>
        </div>
      )}
      <div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">剧本</span>
        <div className="mt-1 bg-slate-50 rounded-lg p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
          {episode.content}
        </div>
      </div>
    </div>
  )
}
