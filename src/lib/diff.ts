// فروقات على مستوى الكلمات (LCS) — كافية لمقارنة نصوص الإصدارات
export type DiffPart = { type: "same" | "added" | "removed"; text: string };

export function diffWords(oldText: string, newText: string): DiffPart[] {
  const a = oldText.split(/(\s+)/).filter((t) => t.length > 0);
  const b = newText.split(/(\s+)/).filter((t) => t.length > 0);
  const n = a.length, m = b.length;

  // حماية من النصوص الضخمة جداً
  if (n * m > 4_000_000) {
    if (oldText === newText) return [{ type: "same", text: oldText }];
    return [
      { type: "removed", text: oldText },
      { type: "added", text: newText },
    ];
  }

  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };

  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { push("same", a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("removed", a[i]); i++; }
    else { push("added", b[j]); j++; }
  }
  while (i < n) { push("removed", a[i]); i++; }
  while (j < m) { push("added", b[j]); j++; }
  return parts;
}
