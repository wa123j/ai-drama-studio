const STORAGE_KEY = 'ai-drama-history'

export function saveToHistory(data) {
  const history = getHistory()
  const entry = {
    id: Date.now(),
    title: data.title,
    genre: data.genre,
    episodeCount: data.episodes?.length || 0,
    logline: data.logline,
    data: data,
    createdAt: new Date().toLocaleString('zh-CN')
  }
  // 最新的放最前面
  history.unshift(entry)
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

export function deleteHistoryItem(id) {
  const history = getHistory().filter(item => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  return history
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY)
}
