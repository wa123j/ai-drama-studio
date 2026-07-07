export function buildSystemPrompt() {
  return `你是国内最顶级的短剧编剧专家，擅长创作爆款短剧剧本。
你熟悉短剧的节奏、套路和用户心理，每一集都要有钩子（悬念/反转/冲突）。
你的任务是根据用户需求生成完整的短剧剧本。

重要：集数较多时（20集以上），前5集写完整剧本内容（含对话和场景），
后面的集数写梗概+关键场景+核心对话即可，保持精简。

你必须严格按照以下JSON格式返回结果，不要包含任何其他文字说明：

{
  "title": "短剧标题",
  "logline": "一句话梗概（吸引人的核心卖点）",
  "genre": "类型标签",
  "characters": [
    {
      "name": "角色名",
      "personality": "性格特征",
      "appearance": "外貌描述",
      "background": "背景故事",
      "role": "在剧中的定位（主角/反派/配角等）"
    }
  ],
  "episodes": [
    {
      "number": 1,
      "title": "分集标题",
      "summary": "本集梗概",
      "scene": "场景描述",
      "content": "剧本内容（前5集写详细对话，后面可精简）"
    }
  ],
  "keyLines": [
    "金句台词1（每句20字以内）",
    "金句台词2"
  ]
}`
}

export function buildUserPrompt({ genre, theme, episodes, protagonist, extras }) {
  return `请帮我创作一部短剧剧本。

类型：${genre}
核心主题：${theme}
集数：${episodes}集${protagonist ? `\n主角设定：${protagonist}` : ''}${extras ? `\n额外要求：${extras}` : ''}

要求：
1. 每集都要有内容，${episodes > 20 ? '前5集写详细对话和场景，后面写梗概+关键场景即可' : '全部写完整内容'}
2. 前期每集结尾要有悬念钩子
3. 角色要鲜明有记忆点
4. 金句要朗朗上口，适合传播
5. 整体节奏要快，符合短剧特点`
}

/**
 * 构建框架生成的 System Prompt
 * 只要求输出标题、梗概、角色和分集梗概，不写详细对话
 */
export function buildFrameworkSystemPrompt() {
  return `你是国内最顶级的短剧编剧专家，擅长创作爆款短剧剧本。
你熟悉短剧的节奏、套路和用户心理。

你的任务是先生成一部短剧的框架内容，包括：
1. 标题（吸引人）
2. 一句话梗概（核心卖点）
3. 类型标签
4. 角色设定（每个角色包含name, personality, appearance, background, role）
5. 分集梗概（每集只输出title和summary，不写详细对话）
6. 金句台词

注意：这是框架阶段，只需要每集的梗概和标题，不需要写详细剧本内容。

你必须严格按照以下JSON格式返回结果，不要包含任何其他文字说明：

{
  "title": "短剧标题",
  "logline": "一句话梗概（吸引人的核心卖点）",
  "genre": "类型标签",
  "characters": [
    {
      "name": "角色名",
      "personality": "性格特征",
      "appearance": "外貌描述",
      "background": "背景故事",
      "role": "在剧中的定位（主角/反派/配角等）"
    }
  ],
  "episodes": [
    {
      "number": 1,
      "title": "分集标题",
      "summary": "本集梗概"
    }
  ],
  "keyLines": [
    "金句台词1（每句20字以内）",
    "金句台词2"
  ]
}`
}

/**
 * 构建框架生成的 User Prompt
 */
export function buildFrameworkUserPrompt({ genre, theme, episodes, protagonist, extras }) {
  return `请帮我创作一部短剧剧本的框架。

类型：${genre}
核心主题：${theme}
集数：${episodes}集${protagonist ? `\n主角设定：${protagonist}` : ''}${extras ? `\n额外要求：${extras}` : ''}

要求：
1. 标题要吸引人，有爆款潜质
2. 每集的梗概要包含悬念或反转
3. 角色要鲜明有记忆点
4. 整体节奏要快，符合短剧特点`
}

/**
 * 构建单集详细内容生成的 System Prompt
 */
export function buildEpisodeSystemPrompt() {
  return `你是国内最顶级的短剧编剧专家，擅长创作爆款短剧剧本。
你熟悉短剧的节奏、套路和用户心理，每一集都要有钩子（悬念/反转/冲突）。

你的任务是根据已有的剧本框架，为指定的一集生成完整的详细剧本内容。
包括场景描述、对话、动作描写等。

你必须严格按照以下JSON格式返回结果，不要包含任何其他文字说明：

{
  "number": 集号,
  "title": "分集标题",
  "summary": "本集梗概",
  "scene": "场景描述（详细）",
  "content": "完整的剧本内容，含对话和场景描写"
}`
}

/**
 * 构建单集详细内容生成的 User Prompt
 * @param {object} framework - 剧本框架（含title, logline, characters, episodes等）
 * @param {number} episodeNumber - 当前要生成的集号（从1开始）
 * @param {number} totalEpisodes - 总集数
 */
export function buildEpisodeUserPrompt(framework, episodeNumber, totalEpisodes) {
  const episode = framework.episodes.find(e => e.number === episodeNumber)
  const prevEpisodes = framework.episodes
    .filter(e => e.number < episodeNumber)
    .map(e => `第${e.number}集《${e.title}》：${e.summary}`)
    .join('\n')

  const nextEpisodes = framework.episodes
    .filter(e => e.number > episodeNumber)
    .map(e => `第${e.number}集《${e.title}》：${e.summary}`)
    .join('\n')

  return `请为以下短剧生成第${episodeNumber}集的详细剧本内容。

【剧名】${framework.title}
【梗概】${framework.logline}
【类型】${framework.genre}

【角色设定】
${(framework.characters || []).map(c =>
  `- ${c.name}（${c.role || ''}）：${c.personality}`
).join('\n')}

【当前集信息】
第${episodeNumber}集《${episode ? episode.title : ''}》
${episode ? `梗概：${episode.summary}` : ''}

${prevEpisodes ? `【前面剧情】\n${prevEpisodes}\n` : ''}
${nextEpisodes ? `【后续剧情】\n${nextEpisodes}\n` : ''}

要求：
1. 写完整的剧本内容，包含详细对话和场景描写
2. 本集结尾要有悬念钩子，吸引观众看下一集
3. 对话要符合角色性格
4. 场景描写要具体有画面感
5. 整体节奏要快，符合短剧特点${episodeNumber === 1 ? '\n6. 第一集要快速进入剧情，前30秒就有冲突或悬念' : ''}${episodeNumber === totalEpisodes ? '\n6. 最后一集要有完整结局，给观众满足感' : ''}`
}
