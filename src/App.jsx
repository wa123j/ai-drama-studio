import { useState, useRef, useCallback, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HeroSection from './components/HeroSection.jsx'
import Features from './components/Features.jsx'
import GeneratorForm from './components/GeneratorForm.jsx'
import LoadingState from './components/LoadingState.jsx'
import ScriptResult from './components/ScriptResult.jsx'
import HistoryList from './components/HistoryList.jsx'
import LoginPage from './components/LoginPage.jsx'
import TopUpPage from './components/TopUpPage.jsx'
import AdminPage from './components/AdminPage.jsx'
import { generateFramework, generateEpisode, abortGenerate } from './utils/api.js'
import { parseScriptResult } from './utils/export.js'
import { saveToHistory } from './utils/history.js'
import { getToken, getUser, clearAuth, refreshUserInfo } from './utils/auth.js'

const EPISODE_TIMEOUT = 45_000

function App() {
  const [page, setPage] = useState('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [phase, setPhase] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [failedEpisodes, setFailedEpisodes] = useState([])
  const [user, setUser] = useState(null)
  const abortRef = useRef(null)
  const resultRef = useRef(null)

  // 初始化：检查登录状态
  useEffect(() => {
    const token = getToken()
    if (token) {
      refreshUserInfo().then(u => {
        if (u) setUser(u)
      })
    }
  }, [])

  const navigate = (target) => {
    setResult(null)
    setError('')
    setPhase(null)
    setProgress({ current: 0, total: 0 })
    setFailedEpisodes([])
    setPage(target)
  }

  const handleLogin = (userData) => {
    setUser(userData)
    setPage('home')
  }

  const handleLogout = () => {
    clearAuth()
    setUser(null)
    navigate('home')
  }

  const handleUserUpdate = (userData) => {
    setUser(userData)
  }

  const handleGenerate = useCallback(async (params) => {
    if (!user) {
      setPage('login')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setFailedEpisodes([])
    setPhase('framework')
    setPage('result')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Phase 1: 生成框架
      const framework = await generateFramework(params, controller.signal)

      const richResult = {
        title: framework.title || '未命名短剧',
        logline: framework.logline || '',
        genre: framework.genre || '',
        characters: framework.characters || [],
        episodes: (framework.episodes || []).map(ep => ({
          number: ep.number,
          title: ep.title || '',
          summary: ep.summary || '',
          scene: ep.scene || '',
          content: ep.content || ''
        })),
        keyLines: framework.keyLines || []
      }

      // 刷新用户额度
      const freshUser = await refreshUserInfo()
      if (freshUser) setUser(freshUser)

      resultRef.current = richResult
      setResult({ ...richResult })
      setPhase('episodes')

      // Phase 2: 逐集生成
      const total = richResult.episodes.length
      setProgress({ current: 0, total })

      for (let i = 0; i < total; i++) {
        if (controller.signal.aborted) break

        const ep = richResult.episodes[i]
        if (ep.content && ep.content.length > 50) {
          setProgress({ current: i + 1, total })
          continue
        }

        setProgress({ current: i, total })
        const timeoutSignal = AbortSignal.timeout(EPISODE_TIMEOUT)
        const combinedSignal = AbortSignal.any([controller.signal, timeoutSignal])

        try {
          const episodeData = await generateEpisode(richResult, ep.number, total, combinedSignal)
          richResult.episodes[i] = {
            ...richResult.episodes[i],
            title: episodeData.title || ep.title,
            summary: episodeData.summary || ep.summary,
            scene: episodeData.scene || '',
            content: episodeData.content || ''
          }
          resultRef.current = { ...richResult }
          setResult({ ...richResult })
          setProgress({ current: i + 1, total })
        } catch (epErr) {
          if (epErr.name === 'AbortError') {
            if (controller.signal.aborted) throw epErr
          }
          console.error(`第${ep.number}集生成失败:`, epErr?.message || epErr)
          richResult.episodes[i] = { ...richResult.episodes[i], content: richResult.episodes[i].content || '' }
          setFailedEpisodes(prev => [...prev, ep.number])
          resultRef.current = { ...richResult }
          setResult({ ...richResult })
          setProgress({ current: i + 1, total })
        }
      }

      setPhase('complete')
      saveToHistory(richResult)
    } catch (err) {
      if (err.needPayment) {
        setError(err.message || '额度不足，请充值')
      } else if (err.name === 'AbortError') {
        setError('已手动停止生成')
      } else {
        setError(err.message || '生成失败，请稍后重试')
      }
      setPhase(null)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [user])

  const handleStop = () => {
    if (abortRef.current) abortRef.current.abort()
  }

  const handleNew = () => {
    setResult(null)
    setError('')
    setPhase(null)
    setProgress({ current: 0, total: 0 })
    setFailedEpisodes([])
    setPage('form')
  }

  const handleViewHistory = (data) => {
    setResult(data)
    setPhase('complete')
    setPage('result')
  }

  // 未登录 → 登录页
  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  // 已登录 → 主界面
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header
        user={user}
        onHome={() => navigate('home')}
        onHistory={() => navigate('history')}
        onTopUp={() => navigate('topup')}
        onAdmin={() => navigate('admin')}
        onLogout={handleLogout}
      />

      <main>
        {page === 'home' && (
          <>
            <HeroSection onStart={() => setPage('form')} />
            <Features />
          </>
        )}

        {page === 'form' && !loading && !result && (
          <div className="max-w-3xl mx-auto px-4 py-16">
            <h2 className="text-3xl font-bold text-center mb-2">开始创作短剧</h2>
            <p className="text-slate-500 text-center mb-10">填写以下信息，AI将为您生成完整剧本</p>
            <GeneratorForm onGenerate={handleGenerate} />
          </div>
        )}

        {loading && phase === 'framework' && (
          <LoadingState phase="framework" onStop={handleStop} />
        )}

        {loading && phase === 'episodes' && result && (
          <div className="max-w-5xl mx-auto px-4 py-16">
            <LoadingState phase="episodes" progress={progress} failedEpisodes={failedEpisodes} onStop={handleStop} />
            <ScriptResult data={result} phase={phase} failedEpisodes={failedEpisodes} />
          </div>
        )}

        {page === 'history' && !loading && (
          <HistoryList onView={handleViewHistory} onClose={() => navigate('form')} />
        )}

        {page === 'topup' && (
          <TopUpPage user={user} onUserUpdate={handleUserUpdate} />
        )}

        {page === 'admin' && user?.isAdmin && (
          <AdminPage user={user} onLogout={handleLogout} />
        )}

        {error && (
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8">
              <div className="text-4xl mb-4">😅</div>
              <h3 className="text-xl font-bold text-red-700 mb-2">
                {error.includes('额度不足') ? '额度不足' : '生成出错了'}
              </h3>
              <p className="text-red-600 mb-6">{error}</p>
              {error.includes('额度不足') ? (
                <button onClick={() => setPage('topup')} className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition">
                  去充值
                </button>
              ) : (
                <button onClick={handleNew} className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition">
                  重新生成
                </button>
              )}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="max-w-5xl mx-auto px-4 py-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">生成结果</h2>
              <button onClick={handleNew} className="bg-primary text-white px-5 py-2 rounded-lg hover:bg-primary-dark transition text-sm">
                + 创作新剧本
              </button>
            </div>
            <ScriptResult data={result} phase={phase} failedEpisodes={failedEpisodes} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
