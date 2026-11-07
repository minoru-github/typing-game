import { GROUPS } from './data/groups';
import { Mode, NETHER_STAGES, modeKey } from './questions';
import { RANKS } from './result';
import type { Best } from './storage';

export type Area = 'overworld' | 'nether' | 'end';

/** クリアに ひつような ランク */
export const CLEAR_RANK_ID = 'gold';
const CLEAR_RANK_INDEX = RANKS.findIndex((r) => r.id === CLEAR_RANK_ID);

export const isClearRank = (rankId: string): boolean => {
  const i = RANKS.findIndex((r) => r.id === rankId);
  return i >= 0 && i <= CLEAR_RANK_INDEX; // RANKS は たかい じゅん
};

export const isCleared = (bests: Record<string, Best>, mode: Mode): boolean => {
  const b = bests[modeKey(mode)];
  return !!b && isClearRank(b.rankId);
};

export const areaModes = (area: Area): Mode[] => {
  if (area === 'overworld') return GROUPS.map((g) => ({ kind: 'overworld', group: g.key }));
  if (area === 'nether') return NETHER_STAGES.map((_, stage) => ({ kind: 'nether', stage }));
  return [{ kind: 'end' }];
};

export function areaProgress(bests: Record<string, Best>, area: Area): { done: number; total: number } {
  const modes = areaModes(area);
  return { done: modes.filter((m) => isCleared(bests, m)).length, total: modes.length };
}

/** エンドシティを ひらくのに クリアが ひつような ネザーの ステージの かず */
export const END_REQUIRED_NETHER = 3;

/**
 * そのモードを ひらく じょうけん：candidates のうち need こ いじょうを クリア
 * - ネザーの ステージ：おなじ 2グループの オーバーワールドを 2つとも
 * - エンドシティ：ネザーの ステージを 3つ いじょう
 */
export function requirements(mode: Mode): { candidates: Mode[]; need: number } {
  if (mode.kind === 'overworld') return { candidates: [], need: 0 };
  if (mode.kind === 'nether') {
    const candidates: Mode[] = NETHER_STAGES[mode.stage].groups.map((group) => ({ kind: 'overworld', group }));
    return { candidates, need: candidates.length };
  }
  return { candidates: areaModes('nether'), need: END_REQUIRED_NETHER };
}

/** ひらく じょうけんの すすみぐあい（done は need を こえない） */
export function requirementProgress(bests: Record<string, Best>, mode: Mode): { done: number; need: number } {
  const { candidates, need } = requirements(mode);
  const cleared = candidates.filter((m) => isCleared(bests, m)).length;
  return { done: Math.min(cleared, need), need };
}

export function isModeUnlocked(bests: Record<string, Best>, mode: Mode, unlockAll = false): boolean {
  if (unlockAll) return true;
  const { done, need } = requirementProgress(bests, mode);
  return done >= need;
}

/** before → after で あたらしく ひらいた モード */
export function newlyUnlocked(before: Record<string, Best>, after: Record<string, Best>): Mode[] {
  return [...areaModes('nether'), ...areaModes('end')].filter(
    (m) => !isModeUnlocked(before, m) && isModeUnlocked(after, m),
  );
}
