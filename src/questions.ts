import { GroupKey, Word, getGroup } from './data/groups';
import { PART_JA } from './data/parts';

/**
 * オーバーワールド：グループごとに「_」で わけた たんご
 * ネザー：2グループを まぜた ID（4ステージ）
 * エンドシティ：ID を くみあわせた コマンド
 */
export type Mode =
  | { kind: 'overworld'; group: GroupKey }
  | { kind: 'nether'; stage: number }
  | { kind: 'end' };

export const NETHER_STAGES: readonly { name: string; groups: readonly [GroupKey, GroupKey] }[] = [
  { name: '真紅の森', groups: ['commands', 'items'] },
  { name: '歪んだ森', groups: ['blocks', 'entities'] },
  { name: 'ネザーの荒野', groups: ['effects', 'enchantments'] },
  { name: 'ソウルサンドの谷', groups: ['biomes', 'gamerules'] },
];

/** ステージで まぜる グループ（例：コマンド ＋ アイテム） */
export const netherStageGroups = (stage: number): string =>
  NETHER_STAGES[stage].groups.map((k) => getGroup(k).name).join(' ＋ ');

export interface Question {
  /** タイプする文字列 */
  text: string;
  /** 日本語の説明 */
  ja: string;
  /** 小さく表示するラベル */
  tag: string;
  icon: string;
}

export type Rng = () => number;

const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)];

export function shuffle<T>(list: readonly T[], r: Rng = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function modeKey(mode: Mode): string {
  if (mode.kind === 'overworld') return `overworld:${mode.group}`;
  if (mode.kind === 'nether') return `nether:${mode.stage}`;
  return 'end';
}

export function modeLabel(mode: Mode): string {
  if (mode.kind === 'overworld') return `オーバーワールド：${getGroup(mode.group).name}`;
  if (mode.kind === 'nether') return `ネザー：${NETHER_STAGES[mode.stage].name}（${netherStageGroups(mode.stage)}）`;
  return 'エンドシティ：コマンドを くみたてよう';
}

// ---------- 上級：コマンドのテンプレート ----------

interface Built {
  text: string;
  ja: string;
}
type Template = (r: Rng) => Built;

const W = (key: GroupKey) => getGroup(key).words;
const giveable = (): readonly Word[] => [...W('items'), ...W('blocks')];

const TIMES = [
  ['day', 'ひる'],
  ['night', 'よる'],
  ['noon', 'おひる'],
  ['midnight', 'まよなか'],
  ['sunrise', 'あさ'],
  ['sunset', 'ゆうがた'],
] as const;
const WEATHERS = [
  ['clear', 'はれ'],
  ['rain', 'あめ'],
  ['thunder', 'かみなり'],
] as const;
const GAMEMODES = [
  ['survival', 'サバイバル'],
  ['creative', 'クリエイティブ'],
  ['adventure', 'アドベンチャー'],
  ['spectator', 'スペクテイター'],
] as const;
const DIFFICULTIES = [
  ['peaceful', 'ピースフル'],
  ['easy', 'イージー'],
  ['normal', 'ノーマル'],
  ['hard', 'ハード'],
] as const;

export const TEMPLATES: readonly Template[] = [
  (r) => {
    const it = pick(r, giveable());
    const n = pick(r, [1, 2, 3, 5, 10, 64]);
    return { text: `/give @p ${it.id} ${n}`, ja: `「${it.ja}」を ${n}こ もらう` };
  },
  (r) => {
    const it = pick(r, W('items'));
    return { text: `/give @a ${it.id}`, ja: `みんなに「${it.ja}」を くばる` };
  },
  (r) => {
    const e = pick(r, W('entities'));
    return { text: `/summon ${e.id}`, ja: `「${e.ja}」を よびだす` };
  },
  (r) => {
    const e = pick(r, W('entities'));
    const d = pick(r, [2, 3, 5]);
    return { text: `/summon ${e.id} ^ ^ ^${d}`, ja: `${d}マス まえに「${e.ja}」を よびだす` };
  },
  (r) => {
    const e = pick(r, W('effects'));
    const sec = pick(r, [10, 30, 60]);
    const amp = pick(r, [0, 1, 2]);
    return {
      text: `/effect @p ${e.id} ${sec} ${amp}`,
      ja: `「${e.ja}」の こうかを レベル${amp + 1}で ${sec}びょう つける`,
    };
  },
  () => ({ text: '/effect @a clear', ja: 'みんなの こうかを ぜんぶ けす' }),
  (r) => {
    const e = pick(r, W('enchantments'));
    const lv = 1 + Math.floor(r() * (e.max ?? 1));
    return { text: `/enchant @p ${e.id} ${lv}`, ja: `もっている どうぐに「${e.ja}」レベル${lv}を つける` };
  },
  (r) => {
    const b = pick(r, W('blocks'));
    return { text: `/setblock ^ ^ ^2 ${b.id}`, ja: `2マス まえに「${b.ja}」を おく` };
  },
  (r) => {
    const b = pick(r, W('blocks'));
    return { text: `/fill ~1 ~ ~1 ~3 ~2 ~3 ${b.id}`, ja: `「${b.ja}」で 3×3×3の かたまりを つくる` };
  },
  (r) => {
    const b = pick(r, W('blocks'));
    return { text: `/execute at @p run setblock ~ ~-1 ~ ${b.id}`, ja: `あしもとの ブロックを「${b.ja}」に かえる` };
  },
  (r) => {
    const n = pick(r, [5, 10, 20, 50, 100]);
    return { text: `/tp @p ~ ~${n} ~`, ja: `${n}マス うえに ワープする` };
  },
  (r) => {
    const e = pick(r, W('entities'));
    return { text: `/tp @p @e[type=${e.id},c=1]`, ja: `いちばん ちかい「${e.ja}」の ところへ ワープする` };
  },
  (r) => {
    const e = pick(r, W('entities'));
    return { text: `/kill @e[type=${e.id}]`, ja: `「${e.ja}」を ぜんぶ けす` };
  },
  () => ({ text: '/kill @e[type=item]', ja: 'おちている アイテムを ぜんぶ けす' }),
  (r) => {
    const e = pick(r, W('entities'));
    return { text: `/execute as @a at @s run summon ${e.id}`, ja: `みんなの いる ばしょに「${e.ja}」を よびだす` };
  },
  (r) => {
    const [id, ja] = pick(r, TIMES);
    return { text: `/time set ${id}`, ja: `じかんを ${ja}に する` };
  },
  (r) => {
    const [id, ja] = pick(r, WEATHERS);
    return { text: `/weather ${id}`, ja: `てんきを ${ja}に する` };
  },
  (r) => {
    const [id, ja] = pick(r, GAMEMODES);
    return { text: `/gamemode ${id}`, ja: `${ja}モードに する` };
  },
  (r) => {
    const [id, ja] = pick(r, DIFFICULTIES);
    return { text: `/difficulty ${id}`, ja: `むずかしさを ${ja}に する` };
  },
  (r) => {
    const g = pick(r, W('gamerules'));
    if (g.values) {
      const v = pick(r, g.values);
      return { text: `/gamerule ${g.id} ${v}`, ja: `ルール「${g.ja}」を ${v}に する` };
    }
    const on = r() < 0.5;
    return { text: `/gamerule ${g.id} ${on}`, ja: `ルール「${g.ja}」を ${on ? 'オン' : 'オフ'}に する` };
  },
  (r) => {
    const b = pick(r, W('biomes'));
    return { text: `/locate biome ${b.id}`, ja: `バイオーム「${b.ja}」を さがす` };
  },
  (r) => {
    const it = pick(r, giveable());
    return { text: `/clear @p ${it.id}`, ja: `もちものから「${it.ja}」を けす` };
  },
  (r) => {
    const n = pick(r, [5, 10, 30]);
    return { text: `/xp ${n}L @p`, ja: `けいけんちを ${n}レベル もらう` };
  },
];

// ---------- 問題を作る ----------

function wordQuestions(key: GroupKey): Question[] {
  const g = getGroup(key);
  return g.words.map((w) => ({ text: w.id, ja: w.ja, tag: g.name, icon: g.icon }));
}

/**
 * れんしゅうモード：ID を「_」で わけた たんご（diamond_sword → diamond, sword）。
 * おなじ たんごは 1かいだけ。
 */
export function practiceQuestions(key: GroupKey): Question[] {
  const g = getGroup(key);
  const whole = new Map(g.words.map((w) => [w.id, w.ja]));
  const out = new Map<string, Question>();
  for (const w of g.words) {
    for (const part of w.id.split('_')) {
      if (out.has(part)) continue;
      const ja = whole.get(part) ?? PART_JA[part] ?? `「${w.ja}」の ことば`;
      const tag = whole.has(part) ? g.name : `${g.name}（${w.id} の ことば）`;
      out.set(part, { text: part, ja, tag, icon: g.icon });
    }
  }
  return [...out.values()];
}

export function buildQuestions(mode: Mode, count: number, r: Rng = Math.random): Question[] {
  if (mode.kind === 'overworld') {
    return shuffle(practiceQuestions(mode.group), r).slice(0, count);
  }
  if (mode.kind === 'nether') {
    // 2つの グループから こうごに とりだして、はんぶんずつ でるように する
    const pools = NETHER_STAGES[mode.stage].groups.map((k) => shuffle(wordQuestions(k), r));
    const out: Question[] = [];
    const seen = new Set<string>();
    for (let i = 0; out.length < count && i < count * 20; i++) {
      const q = pools[i % pools.length].pop();
      if (q && !seen.has(q.text)) {
        seen.add(q.text);
        out.push(q);
      }
    }
    return shuffle(out, r);
  }
  const out: Question[] = [];
  const seen = new Set<string>();
  let order: Template[] = [];
  for (let tries = 0; out.length < count && tries < count * 50; tries++) {
    if (order.length === 0) order = shuffle(TEMPLATES, r);
    const t = order.pop()!;
    const b = t(r);
    if (seen.has(b.text)) continue;
    seen.add(b.text);
    out.push({ text: b.text, ja: b.ja, tag: 'コマンド', icon: '⌨️' });
  }
  return out;
}
