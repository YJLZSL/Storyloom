/**
 * 文本兜底工具：处理空字符串、纯空白、全 ?/？ 等异常输入。
 */

const INVISIBLE_CHARS_RE = /[\s\u200B-\u200D\uFEFF]+/g;
const ALL_QUESTIONS_RE = /^[?？]+$/;

function normalize(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(INVISIBLE_CHARS_RE, ' ').trim();
}

export function safeWorkspaceName(name: string | null | undefined): string {
  const cleaned = normalize(name);
  if (!cleaned) return '未命名工作区';
  if (ALL_QUESTIONS_RE.test(cleaned)) return '未命名工作区';
  return cleaned;
}

export function safeDescription(
  desc: string | null | undefined,
  options?: { maxLength?: number },
): string {
  const cleaned = normalize(desc);
  if (!cleaned) return '暂无描述';
  if (ALL_QUESTIONS_RE.test(cleaned)) return '暂无描述';
  const max = options?.maxLength ?? 60;
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '…' : cleaned;
}
