export default function HeroSection({ onStart }) {
  return (
    <section className="relative overflow-hidden pt-20 pb-28">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-transparent pointer-events-none" />
      <div className="absolute top-20 -left-20 w-80 h-80 bg-amber-300/25 rounded-full blur-3xl" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 bg-yellow-300/15 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-primary px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium mb-5 sm:mb-6">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-pulse" />
          AI驱动的短剧创作工具 · 免费使用
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-5 sm:mb-6">
          一键生成
          <span className="text-primary">爆款短剧</span>
          剧本
        </h1>

        <p className="text-sm sm:text-lg text-slate-500 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
          输入主题和类型，AI自动为你生成完整的短剧剧本——
          包含<span className="text-slate-700 font-semibold">角色卡</span>、
          <span className="text-slate-700 font-semibold">分集剧本</span>、
          <span className="text-slate-700 font-semibold">爆款金句</span>，一键复制导出
        </p>

        <button onClick={onStart} className="bg-primary text-white text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl hover:bg-primary-dark transition shadow-lg shadow-indigo-200 font-bold">
          🚀 立即开始创作
        </button>

        <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { num: '10秒', label: '输入需求' },
            { num: '30秒', label: '生成剧本' },
            { num: '免费', label: '无限使用' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-2xl font-bold text-primary">{item.num}</div>
              <div className="text-sm text-slate-400 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
