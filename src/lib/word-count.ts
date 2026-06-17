export function countCharacters(text: string | null | undefined): number {
  if (!text) return 0;
  // Count Chinese characters and punctuation, exclude whitespace
  return text.replace(/\s/g, '').length;
}

export function countWorkspaceWords(data: {
  events: Array<{ title: string; summary?: string | null; description?: string | null }>;
  characters: Array<{ name: string; description?: string | null }>;
  worldSettings: Array<{ key: string; value: string; description?: string | null }>;
}): number {
  let total = 0;
  for (const e of data.events) {
    total += countCharacters(e.title);
    total += countCharacters(e.summary);
    total += countCharacters(e.description);
  }
  for (const c of data.characters) {
    total += countCharacters(c.name);
    total += countCharacters(c.description);
  }
  for (const w of data.worldSettings) {
    total += countCharacters(w.key);
    total += countCharacters(w.value);
    total += countCharacters(w.description);
  }
  return total;
}
