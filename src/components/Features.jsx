const features = [
  { icon: '⚡', title: '快速生成', desc: '输入主题和类型，30秒内获得完整剧本，告别灵感枯竭' },
  { icon: '📋', title: '专业剧本', desc: '包含角色卡、分集剧情、场景描写和对话，可直接用于拍摄' },
  { icon: '💬', title: '爆款金句', desc: 'AI自动提炼剧本中的传播金句，助力短剧营销推广' },
  { icon: '📤', title: '一键导出', desc: '支持一键复制和TXT下载，随时随地修改完善' },
  { icon: '🎯', title: '多种类型', desc: '支持古装、现代、玄幻、悬疑等多种热门短剧类型' },
  { icon: '🆓', title: '完全免费', desc: '当前版本完全免费使用，不限生成次数' },
]

export default function Features() {
  return (
    <section id="features" className="py-16 bg-white/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">为什么选择AI短剧工坊？</h2>
        <p className="text-sm sm:text-base text-slate-500 text-center mb-10 sm:mb-12">专为短剧创作者打造的AI剧本助手</p>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-surface rounded-2xl p-6 border border-slate-100 hover:shadow-md hover:border-indigo-100 transition">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
