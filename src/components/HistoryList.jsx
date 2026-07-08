import { getHistory, deleteHistoryItem, clearHistory, isScriptComplete, getIncompleteCount } from '../utils/history.js'
import { useState } from 'react'

export default function HistoryList({ onView, onContinue, onClose }) {
  const [history, setHistory] = useState(getHistory())

  const handleDelete = (id) => {
    const updated = deleteHistoryItem(id)
    setHistory(updated)
  }

  const handleClear = () => {
    if (confirm('确定清空所有历史记录吗？')) {
      clearHistory()
      setHistory([])
    }
  }

  if (history.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6">📭</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">还没有历史记录</h2>
        <p className="text-slate-500 mb-6">生成的短剧剧本会自动保存在这里</p>
        <button onClick={onClose} className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-dark transition">
          去生成第一个剧本
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📚 历史记录</h2>
          <p className="text-slate-400 text-sm mt-1">共 {history.length} 部剧本</p>
        </div>
        <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50">
          清空记录
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => {
          const complete = isScriptComplete(item.data)
          const incompleteCount = getIncompleteCount(item.data)

          return (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-100 transition group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-800 truncate">{item.title}</h3>
                    <span className="text-xs bg-indigo-100 text-primary px-2 py-0.5 rounded-full shrink-0">{item.genre}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">{item.episodeCount}集</span>
                    {!complete && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                        未完成 ({item.episodeCount - incompleteCount}/{item.episodeCount})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{item.logline}</p>
                  <p className="text-xs text-slate-400 mt-2">{item.createdAt}</p>
                </div>
                <div className="flex gap-2 shrink-0 items-start">
                  {!complete && (
                    <button
                      onClick={() => onContinue(item.data)}
                      className="bg-amber-500 text-white text-sm px-3 py-2 rounded-lg hover:bg-amber-600 transition"
                    >
                      继续生成
                    </button>
                  )}
                  <button
                    onClick={() => onView(item.data)}
                    className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary-dark transition"
                  >
                    查看
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-sm text-slate-400 hover:text-red-500 transition px-3 py-2 rounded-lg hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
