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
import { saveToHistory, isScriptComplete, getIncompleteCount } from './utils/history.js'
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
  const [retrying, setRetrying] = useState(false)
  const [user, setUser] = useState(null)
  const abortRef = useRef(null)
  const resultRef = useRef(null)
  const failedEpisodesRef = useRef([])

  // 同步 failedEpisodes 到 ref，避免闭包问题
  useEffect(() => {
    failedEpisodesRef.current = failedEpisodes
  }, [failedEpisodes])

  // 初始化：检查登录状态
  useEffect(() => {
    const token = getToken()
    if (token) {
      refreshUserInfo().then(u => {
        if (u) setUser(u)
      })
    }
  }, [])

  // 生成中关闭页面时提示
  useEffect(() => {
    const handler = (e) => {
      if (loading || retrying) {
        e.preventDefault()
        e.returnValue = '剧本正在生成中，关闭后不会在后台继续，确定要离开吗？'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [loading, retrying])

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

      // Phase 2: 逐集生成（含自动重试机制）
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

        let lastError = null
        let success = false

        // 自动重试最多 3 次（网络波动自动恢复）
        for (let attempt = 0; attempt <= 2; attempt++) {
          if (controller.signal.aborted) break

          if (attempt > 0) {
            setPhase(`正在重试第 ${ep.number} 集（第${attempt}次）...`)
            await new Promise(r => setTimeout(r, attempt * 1000))
          }

          try {
            const timeoutSignal = AbortSignal.timeout(EPISODE_TIMEOUT)
            const combinedSignal = AbortSignal.any([controller.signal, timeoutSignal])

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
            success = true
            // 每成功生成一集就保存到历史，关页面也不丢
            saveToHistory(richResult)
            break // 生成成功，跳出重试循环
          } catch (epErr) {
            if (epErr.name === 'AbortError' && controller.signal.aborted) throw epErr
            if (epErr.needPayment) throw epErr // 额度用完，停止整个生成
            lastError = epErr
            console.warn(`第${ep.number}集生成失败(尝试${attempt + 1}/3):`, epErr?.message || epErr)
          }
        }

        // 3 次都失败才标记为失败
        if (!success) {
          console.error(`第${ep.number}集生成失败，已重试3次:`, lastError?.message || lastError)
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
    if (retrying) setRetrying(false)
  }

  /** 手动重试失败的剧集 */
  const handleRetryFailed = useCallback(async () => {
    const richResult = resultRef.current
    if (!richResult) return

    const failedNumbers = [...failedEpisodesRef.current]
    if (failedNumbers.length === 0) return

    setRetrying(true)
    setLoading(true)
    setError('')
    setPhase('episodes')
    setPage('result')

    const controller = new AbortController()
    abortRef.current = controller

    const total = richResult.episodes.length
    setProgress({ current: 0, total })
    setFailedEpisodes([]) // 重置失败列表，重新开始

    const newFailed = []

    try {
      for (let i = 0; i < total; i++) {
      const ep = richResult.episodes[i]
      if (!failedNumbers.includes(ep.number)) {
        setProgress({ current: i + 1, total })
        continue
      }

      if (controller.signal.aborted) break

      let lastError = null
      let success = false

      for (let attempt = 0; attempt <= 2; attempt++) {
        if (controller.signal.aborted) break

        if (attempt > 0) {
          setPhase(`正在重试第 ${ep.number} 集（第${attempt}次）...`)
          await new Promise(r => setTimeout(r, attempt * 1000))
        }

        try {
          const timeoutSignal = AbortSignal.timeout(EPISODE_TIMEOUT)
          const combinedSignal = AbortSignal.any([controller.signal, timeoutSignal])

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
          success = true
          saveToHistory(richResult)
          break
        } catch (epErr) {
          if (epErr.name === 'AbortError' && controller.signal.aborted) throw epErr
          if (epErr.needPayment) throw epErr
          lastError = epErr
          console.warn(`第${ep.number}集重试失败(尝试${attempt + 1}/3):`, epErr?.message || epErr)
        }
      }

      if (!success) {
        newFailed.push(ep.number)
      }

      setProgress({ current: i + 1, total })
    }
    } catch (err) {
      if (err.needPayment) {
        setError(err.message || '额度不足，请充值')
      } else if (err.name === 'AbortError') {
        setError('已手动停止重试')
      } else {
        setError(err.message || '重试失败')
      }
    }

    setFailedEpisodes(newFailed)

    // 刷新额度
    const freshUser = await refreshUserInfo()
    if (freshUser) setUser(freshUser)

    if (newFailed.length === 0) {
      setPhase('complete')
    }
    setRetrying(false)
    setLoading(false)
    abortRef.current = null
  }, [])

  /** 继续生成未完成的剧本 */
  const handleContinueGenerate = useCallback(async (existingResult) => {
    if (!user) {
      setPage('login')
      return
    }

    const richResult = JSON.parse(JSON.stringify(existingResult)) // 深拷贝

    setLoading(true)
    setError('')
    setFailedEpisodes([])
    setPhase('episodes')
    setPage('result')

    const controller = new AbortController()
    abortRef.current = controller

    resultRef.current = richResult
    setResult({ ...richResult })

    // 检查剩余额度：需要生成长度 > 50 的集数 = 未完成的集数
    const total = richResult.episodes.length
    const incompleteCount = getIncompleteCount(richResult)
    const freshUser = await refreshUserInfo()
    if (freshUser) setUser(freshUser)

    if (incompleteCount > 0 && (freshUser?.remainingEpisodes ?? 0) < incompleteCount) {
      setError(`额度不足，需要 ${incompleteCount} 集额度，剩余 ${Math.max(0, freshUser?.remainingEpisodes ?? 0)} 集`)
      setPhase(null)
      setLoading(false)
      abortRef.current = null
      return
    }

    setProgress({ current: 0, total })

    for (let i = 0; i < total; i++) {
      if (controller.signal.aborted) break

      const ep = richResult.episodes[i]
      if (ep.content && ep.content.length > 50) {
        setProgress({ current: i + 1, total })
        continue
      }

      setProgress({ current: i, total })

      let lastError = null
      let success = false

      for (let attempt = 0; attempt <= 2; attempt++) {
        if (controller.signal.aborted) break

        if (attempt > 0) {
          setPhase(`正在续写第 ${ep.number} 集（第${attempt}次）...`)
          await new Promise(r => setTimeout(r, attempt * 1000))
        }

        try {
          const timeoutSignal = AbortSignal.timeout(EPISODE_TIMEOUT)
          const combinedSignal = AbortSignal.any([controller.signal, timeoutSignal])

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
          success = true
          saveToHistory(richResult)
          break
        } catch (epErr) {
          if (epErr.name === 'AbortError' && controller.signal.aborted) throw epErr
          if (epErr.needPayment) throw epErr
          lastError = epErr
          console.warn(`第${ep.number}集续写失败(尝试${attempt + 1}/3):`, epErr?.message || epErr)
        }
      }

      if (!success) {
        console.error(`第${ep.number}集续写失败，已重试3次:`, lastError?.message || lastError)
        richResult.episodes[i] = { ...richResult.episodes[i], content: richResult.episodes[i].content || '' }
        setFailedEpisodes(prev => [...prev, ep.number])
        resultRef.current = { ...richResult }
        setResult({ ...richResult })
        setProgress({ current: i + 1, total })
      }
    }

    const freshUser2 = await refreshUserInfo()
    if (freshUser2) setUser(freshUser2)
    setPhase('complete')
    saveToHistory(richResult)
    setLoading(false)
    abortRef.current = null
  }, [user])

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
    if (isScriptComplete(data)) {
      setPhase('complete')
    } else {
      setPhase('incomplete') // 未完成，显示继续生成按钮
    }
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
            <LoadingState phase="episodes" progress={progress} failedEpisodes={failedEpisodes} retrying={retrying} onStop={handleStop} />
            <ScriptResult data={result} phase={phase} failedEpisodes={failedEpisodes} onRetryFailed={handleRetryFailed} retrying={retrying} onContinue={handleContinueGenerate} />
          </div>
        )}

        {page === 'history' && !loading && (
          <HistoryList onView={handleViewHistory} onContinue={handleContinueGenerate} onClose={() => navigate('form')} />
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
              <div className="flex gap-2">
                {phase === 'incomplete' && (
                  <button onClick={() => handleContinueGenerate(result)} className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition text-sm font-medium">
                    🚀 继续生成（{getIncompleteCount(result)}集）
                  </button>
                )}
                <button onClick={handleNew} className="bg-primary text-white px-5 py-2 rounded-lg hover:bg-primary-dark transition text-sm">
                  + 创作新剧本
                </button>
              </div>
            </div>
            <ScriptResult data={result} phase={phase} failedEpisodes={failedEpisodes} onRetryFailed={handleRetryFailed} retrying={retrying} onContinue={handleContinueGenerate} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
