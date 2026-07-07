import { authFetch } from './auth.js'

const API_BASE = '/api'

export async function generateScript(params, signal) {
  const response = await authFetch(`${API_BASE}/generate`, {
    method: 'POST',
    body: JSON.stringify(params),
    signal
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `请求失败 (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }

  return result
}

export async function generateFramework(params, signal) {
  const response = await authFetch(`${API_BASE}/generate/framework`, {
    method: 'POST',
    body: JSON.stringify(params),
    signal
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (response.status === 403 && data.needPayment) {
      throw { needPayment: true, remainingEpisodes: data.remainingEpisodes, message: data.error }
    }
    throw new Error(data.error || `请求失败 (${response.status})`)
  }

  const result = await response.json()
  if (!result.success || !result.data) {
    throw new Error('框架数据异常')
  }

  return result.data
}

export async function generateEpisode(framework, episodeNumber, totalEpisodes, signal) {
  const lightFramework = {
    title: framework.title,
    logline: framework.logline,
    genre: framework.genre,
    characters: framework.characters || [],
    episodes: (framework.episodes || []).map(ep => ({
      number: ep.number,
      title: ep.title,
      summary: ep.summary
    })),
    keyLines: framework.keyLines || []
  }

  const response = await authFetch(`${API_BASE}/generate/episode`, {
    method: 'POST',
    body: JSON.stringify({ framework: lightFramework, episodeNumber, totalEpisodes }),
    signal
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `请求失败 (${response.status})`)
  }

  const result = await response.json()
  if (!result.success || !result.data) {
    throw new Error('单集数据异常')
  }

  return result.data
}

export function abortGenerate(abortController) {
  if (abortController) {
    abortController.abort()
  }
}
