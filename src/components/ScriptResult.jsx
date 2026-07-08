import { useState } from 'react'
import DramaOverview from './DramaOverview.jsx'
import CharacterCards from './CharacterCards.jsx'
import EpisodeList from './EpisodeList.jsx'
import KeyLines from './KeyLines.jsx'
import { copyAllText, downloadTxt } from '../utils/export.js'

export default function ScriptResult({ data, phase, failedEpisodes, onRetryFailed, retrying, onContinue }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)

  const tabs = [
    { key: 'overview', label: '📋 概览' },
    { key: 'characters', label: '👥 角色' },
    { key: 'episodes', label: '📜 剧本' },
    { key: 'keylines', label: '💬 金句' },
  ]

  const isGenerating = phase === 'episodes'
  const isIncomplete = phase === 'incomplete'

  const handleCopy = async () => {
    const text = copyAllText(data)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* 未完成提示条 */}
      {isIncomplete && onContinue && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
          <div className="text-sm text-amber-700">
            <span className="font-bold">⏳ 剧本未完成</span> — 部分剧集还没有生成，您可以继续生成剩余内容
          </div>
          <button onClick={() => onContinue(data)} className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition text-sm font-medium shrink-0">
            继续生成
          </button>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={handleCopy} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition">
          {copied ? '✅ 已复制' : '📋 复制'}
        </button>
        <button onClick={() => downloadTxt(data)} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition">
          📥 下载
        </button>
        {/* 重试失败剧集按钮 */}
        {failedEpisodes?.length > 0 && !isGenerating && !retrying && (
          <button onClick={onRetryFailed} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-amber-700 hover:bg-amber-100 transition">
            🔄 重试（{failedEpisodes.length}集）
          </button>
        )}
        {isGenerating && (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            {retrying ? '重试中...' : '生成中...'}
          </span>
        )}
      </div>

      {/* Tab切换 */}
      <div className="sticky top-16 z-40 -mx-4 px-4 bg-gradient-to-b from-slate-50 to-transparent pb-2 mb-4 sm:static sm:mx-0 sm:px-0 sm:bg-none sm:pb-0 sm:mb-6">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      {activeTab === 'overview' && <DramaOverview data={data} />}
      {activeTab === 'characters' && <CharacterCards characters={data.characters} />}
      {activeTab === 'episodes' && <EpisodeList episodes={data.episodes} failedEpisodes={failedEpisodes} />}
      {activeTab === 'keylines' && <KeyLines lines={data.keyLines} />}
    </div>
  )
}
