import { useState } from 'react'

const genres = ['古装', '现代', '都市', '玄幻', '悬疑', '喜剧', '甜宠', '重生']

export default function GeneratorForm({ onGenerate }) {
  const [form, setForm] = useState({
    genre: '现代',
    theme: '',
    episodes: 20,
    protagonist: '',
    extras: ''
  })

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.theme.trim()) return
    onGenerate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      {/* 短剧类型 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">短剧类型</label>
        <div className="flex flex-wrap gap-2">
          {genres.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => handleChange('genre', g)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                form.genre === g
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 核心主题 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">核心主题</label>
        <input
          type="text"
          value={form.theme}
          onChange={e => handleChange('theme', e.target.value)}
          placeholder="例如：重生复仇、赘婿逆袭、甜宠虐恋..."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          required
        />
      </div>

      {/* 集数 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          集数：<span className="text-primary font-bold">{form.episodes}集</span>
        </label>
        <input
          type="range"
          min={10}
          max={100}
          step={10}
          value={form.episodes}
          onChange={e => handleChange('episodes', Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>10集</span>
          <span>100集</span>
        </div>
      </div>

      {/* 主角设定（可选） */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          主角设定 <span className="text-slate-400 font-normal">（可选）</span>
        </label>
        <input
          type="text"
          value={form.protagonist}
          onChange={e => handleChange('protagonist', e.target.value)}
          placeholder="例如：男主冷面总裁×女主呆萌助理"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
        />
      </div>

      {/* 额外要求（可选） */}
      <div className="mb-8">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          额外要求 <span className="text-slate-400 font-normal">（可选）</span>
        </label>
        <textarea
          value={form.extras}
          onChange={e => handleChange('extras', e.target.value)}
          placeholder="例如：要有反转结局、每集结尾留悬念、加入搞笑元素..."
          rows={3}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={!form.theme.trim()}
        className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
      >
        🤖 AI生成剧本
      </button>
    </form>
  )
}
