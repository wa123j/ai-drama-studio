export default function CharacterCards({ characters }) {
  if (!characters?.length) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
      暂无角色信息
    </div>
  )

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {characters.map((char, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-indigo-100 transition">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-rose-100 flex items-center justify-center text-2xl flex-shrink-0">
              {['🎭', '👩', '👨', '🧑', '👸', '🤴', '🧙', '🦹'][i % 8]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-800">{char.name}</h3>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{char.role || '角色'}</span>
              </div>
              <p className="text-sm text-slate-500 mb-2">
                <span className="font-medium text-slate-600">性格：</span>{char.personality}
              </p>
              <p className="text-sm text-slate-500 mb-1">
                <span className="font-medium text-slate-600">外貌：</span>{char.appearance}
              </p>
              {char.background && (
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  <span className="font-medium text-slate-500">背景：</span>{char.background}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
