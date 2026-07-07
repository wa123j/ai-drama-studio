export default function KeyLines({ lines }) {
  if (!lines?.length) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
      暂无金句
    </div>
  )

  return (
    <div className="grid gap-3">
      {lines.map((line, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 hover:border-rose-200 hover:shadow-sm transition group">
          <span className="text-2xl">{['🔥', '💎', '⚡', '🌟', '💔', '😤', '🥺', '👑'][i % 8]}</span>
          <p className="flex-1 text-lg font-medium text-slate-800">「{line}」</p>
          <button
            onClick={() => navigator.clipboard.writeText(line)}
            className="text-sm text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition px-3 py-1 rounded-lg hover:bg-indigo-50"
          >
            复制
          </button>
        </div>
      ))}
    </div>
  )
}
