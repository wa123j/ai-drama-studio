import { useState } from 'react'
import EpisodeDetail from './EpisodeDetail.jsx'

export default function EpisodeList({ episodes, failedEpisodes }) {
  const [expanded, setExpanded] = useState(null)
  const failedSet = new Set(failedEpisodes || [])

  if (!episodes?.length) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
      暂无分集剧本
    </div>
  )

  return (
    <div className="space-y-3">
      {episodes.map((ep, i) => {
        const isFailed = failedSet.has(ep.number)
        return (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-sm transition">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  isFailed
                    ? 'bg-red-50 text-red-500'
                    : ep.content?.length > 50
                      ? 'bg-green-50 text-green-600'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {ep.number}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800">{ep.title}</h3>
                  <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">
                    {isFailed ? '⚠️ 生成失败' : (ep.summary || '等待生成...')}
                  </p>
                </div>
              </div>
              <span className={`text-slate-400 transition ${expanded === i ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            {expanded === i && <EpisodeDetail episode={ep} isFailed={isFailed} />}
          </div>
        )
      })}
    </div>
  )
}
