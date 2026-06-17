// This function generates a context summary for AI conversations
// It should be called at the point of sending a message, not in a React component
export function buildAIContext(data: {
  workspaceName: string;
  events: Array<{ title: string; summary: string | null; startTime: Date | null }>;
  characters: Array<{ name: string; role: string | null; description: string | null }>;
  worldSettings: Array<{ key: string; value: string; category: string | null }>;
  foreshadowings: Array<{ title: string; status: string; description: string | null }>;
}): string {
  const parts: string[] = [];

  parts.push(`当前工作区: ${data.workspaceName}`);

  if (data.events.length > 0) {
    parts.push(`\n事件概要 (共${data.events.length}个):`);
    data.events.slice(0, 20).forEach(e => {
      const time = e.startTime ? new Date(e.startTime).toLocaleDateString('zh-CN') : '未设定时间';
      parts.push(`- ${e.title} (${time})${e.summary ? ': ' + e.summary.slice(0, 50) : ''}`);
    });
    if (data.events.length > 20) parts.push(`...还有${data.events.length - 20}个事件`);
  }

  if (data.characters.length > 0) {
    parts.push(`\n角色列表 (共${data.characters.length}个):`);
    data.characters.forEach(c => {
      parts.push(`- ${c.name}${c.role ? '(' + c.role + ')' : ''}${c.description ? ': ' + c.description.slice(0, 40) : ''}`);
    });
  }

  if (data.worldSettings.length > 0) {
    parts.push(`\n世界观设定 (共${data.worldSettings.length}条):`);
    data.worldSettings.slice(0, 15).forEach(s => {
      parts.push(`- [${s.category || '其他'}] ${s.key}: ${s.value.slice(0, 50)}`);
    });
  }

  if (data.foreshadowings.length > 0) {
    const active = data.foreshadowings.filter(f => f.status === 'planted' || f.status === 'developed');
    if (active.length > 0) {
      parts.push(`\n活跃伏笔 (共${active.length}条):`);
      active.forEach(f => {
        parts.push(`- ${f.title} [${f.status}]${f.description ? ': ' + f.description.slice(0, 40) : ''}`);
      });
    }
  }

  return parts.join('\n');
}

// Parse @mentions from user input
export function parseMentions(input: string, entities: {
  characters: Array<{ name: string; description: string | null }>;
  events: Array<{ title: string; summary: string | null; description: string | null }>;
}): { text: string; mentions: string[] } {
  const mentions: string[] = [];
  const mentionPattern = /@(\S+)/g;
  let match;

  while ((match = mentionPattern.exec(input)) !== null) {
    const name = match[1];
    // Find matching character or event
    const char = entities.characters.find(c => c.name.includes(name));
    const evt = entities.events.find(e => e.title.includes(name));

    if (char) {
      mentions.push(`角色 ${char.name}: ${char.description || '无描述'}`);
    } else if (evt) {
      mentions.push(`事件 ${evt.title}: ${evt.summary || evt.description || '无描述'}`);
    }
  }

  return { text: input, mentions };
}
