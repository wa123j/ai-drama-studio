import { useState, useEffect } from 'react'
import { refreshUserInfo } from '../utils/auth.js'

const PLANS = [
  { name: '基础包', episodes: 50, price: '¥9.90' },
  { name: '专业包', episodes: 120, price: '¥19.90' },
  { name: '无限包（月）', episodes: 99999, price: '¥49.90', popular: true },
]

export default function TopUpPage({ user, onUserUpdate }) {
  const [selected, setSelected] = useState(PLANS[1])

  useEffect(() => {
    refreshUserInfo().then(u => {
      if (u) onUserUpdate(u)
    })
  }, [onUserUpdate])

  const remaining = user?.remainingEpisodes ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* 剩余额度 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">充值中心</h1>
          <p className="text-slate-500">
            当前剩余额度：<span className="text-primary font-bold text-xl">{remaining}</span> 集
            {remaining <= 0 && <span className="text-red-500 ml-2">（已用完）</span>}
          </p>
        </div>

        {/* 套餐选择 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {PLANS.map(plan => (
            <button
              key={plan.name}
              onClick={() => setSelected(plan)}
              className={`relative rounded-2xl border-2 p-6 text-left transition ${
                selected.name === plan.name
                  ? 'border-primary bg-indigo-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full font-bold">
                  推荐
                </span>
              )}
              <h3 className="font-bold text-lg text-slate-800">{plan.name}</h3>
              <p className="text-3xl font-bold text-primary mt-2">{plan.price}</p>
              <p className="text-sm text-slate-500 mt-1">{plan.episodes === 99999 ? '不限量' : `${plan.episodes} 集额度`}</p>
            </button>
          ))}
        </div>

        {/* 支付说明 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 text-center">扫码支付</h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {/* 左侧操作说明 */}
            <div className="text-sm text-slate-600 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>微信扫码添加下方好友</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>微信扫码支付 <strong>「{selected.name}」</strong>（{selected.price}）</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>告知你的用户名：<strong>{user?.username}</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <span>收到后我们 <strong>手动充值</strong> 到你的账号</span>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                ⏱ 充值时间：每天 10:00~22:00，通常在 30 分钟内到账
              </div>
            </div>

            {/* 右侧收款码 */}
            <div className="text-center">
              <div className="w-40 sm:w-48 h-40 sm:h-48 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <img
                  src="/wechat-qr.jpg"
                  alt="微信收款码"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="w-full h-full bg-slate-100 hidden items-center justify-center">
                  <div className="text-center text-slate-400">
                    <div className="text-4xl mb-2">💬</div>
                    <span className="text-xs">微信收款码</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">微信扫码支付</p>
              <p className="text-xs text-slate-400">微信号：<strong>wa123j</strong></p>
            </div>
          </div>
        </div>

        {/* 提示 */}
        <div className="mt-6 bg-slate-50 rounded-xl p-4 text-xs text-slate-400">
          <p>💡 付费说明：</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>免费额度 10 集用完后，需要付费购买额外额度</li>
            <li>额度长期有效，不过期</li>
            <li>联系微信充值到账后，刷新页面即可看到更新</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
