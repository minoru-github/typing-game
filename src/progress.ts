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

/** そのエリアに ひとつ まえの エリア */
export const PREV_AREA: Record<Area, Area | null> = { overworld: null, nether: 'overworld', end: 'nether' };

export function isUnlocked(bests: Record<string, Best>, area: Area, unlockAll = false): boolean {
  if (unlockAll) return true;
  const prev = PREV_AREA[area];
  if (!prev) return true;
  const p = areaProgress(bests, prev);
  return isUnlocked(bests, prev) && p.done === p.total;
}
