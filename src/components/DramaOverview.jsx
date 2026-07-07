export default function DramaOverview({ data }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-indigo-100 text-primary text-xs font-bold px-3 py-1 rounded-full">{data.genre}</span>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">{data.episodes?.length || '?'}集</span>
      </div>

      <h2 className="text-3xl font-extrabold text-slate-900 mb-4">{data.title}</h2>
      <p className="text-slate-500 text-lg leading-relaxed mb-6">{data.logline}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{data.characters?.length || 0}</div>
          <div className="text-sm text-slate-400">角色</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{data.episodes?.length || 0}</div>
          <div className="text-sm text-slate-400">集数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{data.keyLines?.length || 0}</div>
          <div className="text-sm text-slate-400">金句</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {(() => {
              const total = data.episodes?.reduce((sum, ep) => sum + (ep.content?.length || 0), 0) || 0
              return total > 1000 ? `${(total / 1000).toFixed(1)}k` : total
            })()}
          </div>
          <div className="text-sm text-slate-400">总字数</div>
        </div>
      </div>
    </div>
  )
}
