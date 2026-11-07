import type { TypingSession } from './session';

export interface Rank {
  id: string;
  name: string;
  min: number;
  message: string;
}

/** スコアが高い順。スコア = 1分あたりの正しい打鍵数 × 正確さ² */
export const RANKS: readonly Rank[] = [
  { id: 'netherite', name: 'ネザライト', min: 200, message: 'でんせつの タイピングマスター!' },
  { id: 'diamond', name: 'ダイヤモンド', min: 150, message: 'すごすぎる! プロ なみ!' },
  { id: 'gold', name: 'ゴールド', min: 110, message: 'とっても はやい!' },
  { id: 'iron', name: 'アイアン', min: 75, message: 'いい ちょうし! もう すこしで ゴールド!' },
  { id: 'stone', name: 'ストーン', min: 45, message: 'がんばってるね! つづけよう!' },
  { id: 'wood', name: 'ウッド', min: 0, message: 'まずは ゆっくり せいかくに うとう!' },
];

export interface Result {
  seconds: number;
  kpm: number;
  accuracy: number;
  score: number;
  rank: Rank;
  correct: number;
  misses: number;
  weakKeys: [string, number][];
}

export function calcResult(s: TypingSession): Result {
  const seconds = Math.max(0.001, (s.finishedAt - s.startedAt) / 1000);
  const kpm = (s.correct / seconds) * 60;
  const total = s.correct + s.misses;
  const accuracy = total === 0 ? 0 : s.correct / total;
  const score = Math.round(kpm * accuracy * accuracy);
  const rank = RANKS.find((r) => score >= r.min) ?? RANKS[RANKS.length - 1];
  const weakKeys = [...s.missMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { seconds, kpm, accuracy, score, rank, correct: s.correct, misses: s.misses, weakKeys };
}
