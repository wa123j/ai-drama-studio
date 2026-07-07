/**
 * 解析Claude返回的文本，提取其中的JSON
 */
export function parseScriptResult(text) {
  // 尝试提取JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('无法解析AI返回的剧本数据，请重试')
  }

  try {
    const data = JSON.parse(jsonMatch[0])
    return {
      title: data.title || '未命名短剧',
      logline: data.logline || '',
      genre: data.genre || '',
      characters: data.characters || [],
      episodes: data.episodes || [],
      keyLines: data.keyLines || []
    }
  } catch {
    throw new Error('解析剧本数据失败，请重试')
  }
}

/**
 * 复制全部文本
 */
export function copyAllText(data) {
  let text = `《${data.title}》\n`
  text += `${data.logline}\n`
  text += `类型：${data.genre}  |  集数：${data.episodes?.length || 0}集\n\n`

  text += '━'.repeat(30) + '\n'
  text += '【角色介绍】\n\n'
  data.characters?.forEach(c => {
    text += `【${c.name}】${c.role || ''}\n`
    text += `  性格：${c.personality}\n`
    text += `  外貌：${c.appearance}\n`
    if (c.background) text += `  背景：${c.background}\n`
    text += '\n'
  })

  text += '━'.repeat(30) + '\n'
  text += '【分集剧本】\n\n'
  data.episodes?.forEach(ep => {
    text += `第${ep.number}集 ${ep.title}\n`
    text += `${ep.summary}\n\n`
    if (ep.scene) text += `场景：${ep.scene}\n\n`
    text += `${ep.content}\n\n`
    text += '─'.repeat(20) + '\n\n'
  })

  if (data.keyLines?.length) {
    text += '━'.repeat(30) + '\n'
    text += '【爆款金句】\n\n'
    data.keyLines.forEach(line => { text += `「${line}」\n` })
  }

  return text
}

/**
 * 下载TXT文件
 */
export function downloadTxt(data) {
  const text = copyAllText(data)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.title || '短剧剧本'}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
