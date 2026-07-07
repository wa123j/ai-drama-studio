import { useState } from 'react'
import DramaOverview from './DramaOverview.jsx'
import CharacterCards from './CharacterCards.jsx'
import EpisodeList from './EpisodeList.jsx'
import KeyLines from './KeyLines.jsx'
import { copyAllText, downloadTxt } from '../utils/export.js'

export default function ScriptResult({ data, phase, failedEpisodes }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)

  const tabs = [
    { key: 'overview', label: '📋 概览' },
    { key: 'characters', label: '👥 角色' },
    { key: 'episodes', label: '📜 剧本' },
    { key: 'keylines', label: '💬 金句' },
  ]

  const isGenerating = phase === 'episodes'

  const handleCopy = async () => {
    const text = copyAllText(data)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* 操作栏 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={handleCopy} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
          {copied ? '✅ 已复制' : '📋 复制全部'}
        </button>
        <button onClick={() => downloadTxt(data)} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
          📥 下载TXT
        </button>
        {isGenerating && (
          <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-xl text-sm font-medium">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            生成中...
          </span>
        )}
      </div>

      {/* Tab切换 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {activeTab === 'overview' && <DramaOverview data={data} />}
      {activeTab === 'characters' && <CharacterCards characters={data.characters} />}
      {activeTab === 'episodes' && <EpisodeList episodes={data.episodes} failedEpisodes={failedEpisodes} />}
      {activeTab === 'keylines' && <KeyLines lines={data.keyLines} />}
    </div>
  )
}
