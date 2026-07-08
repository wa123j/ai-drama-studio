const STORAGE_KEY = 'ai-drama-history'

export function saveToHistory(data) {
  const history = getHistory()
  // 如果已有同标题的剧本，更新它（继续生成时覆盖旧记录，避免重复）
  const existingIndex = history.findIndex(item => item.title === data.title && item.episodeCount === data.episodes?.length)
  const entry = {
    id: existingIndex >= 0 ? history[existingIndex].id : Date.now(),
    title: data.title,
    genre: data.genre,
    episodeCount: data.episodes?.length || 0,
    logline: data.logline,
    data: data,
    createdAt: existingIndex >= 0 ? history[existingIndex].createdAt : new Date().toLocaleString('zh-CN')
  }

  if (existingIndex >= 0) {
    history[existingIndex] = entry
  } else {
    history.unshift(entry)
  }

  // 最多保存50条
  if (history.length > 50) history.pop()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return entry
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isScriptComplete(data) {
  if (!data?.episodes?.length) return false
  return data.episodes.every(ep => ep.content && ep.content.length > 50)
}

export function getIncompleteCount(data) {
  if (!data?.episodes?.length) return 0
  return data.episodes.filter(ep => !ep.content || ep.content.length <= 50).length
}

export function deleteHistoryItem(id) {
  const history = getHistory().filter(item => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return history
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}
