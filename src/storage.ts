export interface Best {
  score: number;
  rankId: string;
  kpm: number;
  accuracy: number;
}

const BEST_KEY = 'craft-typing:best';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 保存できなくても遊べる */
  }
}

/** まえの バージョンの きろくの なまえを いまの なまえに なおす */
export function migrateBests(raw: Record<string, Best>): Record<string, Best> {
  const out: Record<string, Best> = {};
  for (const [key, best] of Object.entries(raw)) {
    let k: string | null = key;
    if (key.startsWith('practice:')) k = `overworld:${key.slice('practice:'.length)}`;
    else if (key === 'advanced') k = 'end';
    else if (key.startsWith('beginner:') || key === 'intermediate') k = null; // なくなった モード
    if (k && (!out[k] || out[k].score < best.score)) out[k] = best;
  }
  return out;
}

export const loadBests = (): Record<string, Best> => migrateBests(read<Record<string, Best>>(BEST_KEY, {}));

/** 自己ベストなら保存して true を返す */
export function saveBest(mode: string, best: Best): boolean {
  const all = loadBests();
  const prev = all[mode];
  if (prev && prev.score >= best.score) return false;
  all[mode] = best;
  write(BEST_KEY, all);
  return true;
}
