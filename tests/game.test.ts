import { describe, expect, it } from 'vitest';
import { GROUPS } from '../src/data/groups';
import { Mode, NETHER_STAGES, TEMPLATES, buildQuestions, modeKey, practiceQuestions } from '../src/questions';
import { areaModes, isUnlocked } from '../src/progress';
import { Best, migrateBests } from '../src/storage';
import { TypingSession } from '../src/session';
import { findKey } from '../src/keyboard';
import { calcResult } from '../src/result';

/** 再現できる乱数 */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe('単語データ', () => {
  for (const g of GROUPS) {
    it(`${g.name}: ID は英小文字・数字・_ だけで重複なし`, () => {
      const ids = g.words.map((w) => w.id);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9_]+$/);
      expect(new Set(ids).size).toBe(ids.length);
      expect(g.words.every((w) => w.ja.length > 0)).toBe(true);
    });
  }
  it('エンチャントには最大レベルがある', () => {
    const ench = GROUPS.find((g) => g.key === 'enchantments')!;
    expect(ench.words.every((w) => (w.max ?? 0) >= 1)).toBe(true);
  });
});

describe('上級コマンド', () => {
  it('どのテンプレートも ASCII の 1 行コマンドを作り、JIS配列で打てる', () => {
    const r = seeded(42);
    for (let i = 0; i < 500; i++) {
      for (const t of TEMPLATES) {
        const { text, ja } = t(r);
        expect(text).toMatch(/^\/[ -~]+$/);
        expect(text).not.toMatch(/ {2}|\s$/);
        expect(ja.length).toBeGreaterThan(0);
        for (const ch of text) {
          expect(findKey(ch), ch).not.toBeNull();
        }
      }
    }
  });
  it('エンチャントのレベルは最大を超えない', () => {
    const r = seeded(7);
    const ench = GROUPS.find((g) => g.key === 'enchantments')!.words;
    const qs = Array.from({ length: 300 }, () => buildQuestions({ kind: 'end' }, 20, r)).flat();
    for (const q of qs.filter((q) => q.text.startsWith('/enchant '))) {
      const [, , id, lv] = q.text.split(' ');
      expect(Number(lv)).toBeLessThanOrEqual(ench.find((w) => w.id === id)!.max!);
    }
  });
});

describe('れんしゅうモード', () => {
  for (const g of GROUPS) {
    it(`${g.name}: 「_」なし・重複なし・ぜんぶ いみが ある`, () => {
      const qs = practiceQuestions(g.key);
      expect(qs.length).toBeGreaterThan(0);
      expect(new Set(qs.map((q) => q.text)).size).toBe(qs.length);
      for (const q of qs) {
        expect(q.text).toMatch(/^[a-z0-9]+$/);
        // 辞書にない たんごが あると「〜の ことば」に なるので、それを きんしする
        expect(q.ja, q.text).not.toMatch(/の ことば$/);
      }
      // もとの ID の たんごが ぜんぶ でてくる
      const texts = new Set(qs.map((q) => q.text));
      for (const w of g.words) for (const p of w.id.split('_')) expect(texts.has(p)).toBe(true);
    });
  }
  it('diamond_sword は diamond と sword に わかれる', () => {
    const qs = practiceQuestions('items');
    expect(qs.find((q) => q.text === 'sword')?.ja).toBe('けん');
    expect(qs.find((q) => q.text === 'diamond')?.ja).toBe('ダイヤモンド');
  });
});

describe('問題づくり', () => {
  it('指定した数だけ重複なしで作る', () => {
    const modes: Mode[] = [
      ...GROUPS.filter((g) => practiceQuestions(g.key).length >= 20).map((g) => ({ kind: 'overworld', group: g.key }) as Mode),
      ...NETHER_STAGES.map((_, stage) => ({ kind: 'nether', stage }) as Mode),
      { kind: 'end' },
    ];
    for (const mode of modes) {
      const qs = buildQuestions(mode, 20, seeded(1));
      expect(qs, modeKey(mode)).toHaveLength(20);
      expect(new Set(qs.map((q) => q.text)).size).toBe(20);
    }
  });
  it('どの モードでも 10もん つくれる', () => {
    const modes: Mode[] = [...areaModes('overworld'), ...areaModes('nether'), ...areaModes('end')];
    for (const mode of modes) expect(buildQuestions(mode, 10, seeded(5)), modeKey(mode)).toHaveLength(10);
  });
  it('ネザーの4ステージで 8グループを 1かいずつ つかう', () => {
    const used = NETHER_STAGES.flatMap((s) => s.groups);
    expect(used).toHaveLength(GROUPS.length);
    expect(new Set(used)).toEqual(new Set(GROUPS.map((g) => g.key)));
  });
  it('ネザーは 2グループから はんぶんずつ でる', () => {
    NETHER_STAGES.forEach((s, stage) => {
      const qs = buildQuestions({ kind: 'nether', stage }, 10, seeded(stage + 1));
      for (const k of s.groups) {
        const name = GROUPS.find((g) => g.key === k)!.name;
        expect(qs.filter((q) => q.tag === name)).toHaveLength(5);
      }
    });
  });
});

describe('かいほう', () => {
  const best = (rankId: string): Best => ({ score: 1, rankId, kpm: 1, accuracy: 1 });
  const all = (area: 'overworld' | 'nether', rankId: string) =>
    Object.fromEntries(areaModes(area).map((m) => [modeKey(m), best(rankId)]));

  it('はじめは オーバーワールドだけ', () => {
    expect(isUnlocked({}, 'overworld')).toBe(true);
    expect(isUnlocked({}, 'nether')).toBe(false);
    expect(isUnlocked({}, 'end')).toBe(false);
  });
  it('オーバーワールドを ぜんぶ ゴールド いじょうで ネザーが ひらく', () => {
    const bests = { ...all('overworld', 'gold'), 'overworld:items': best('netherite') };
    expect(isUnlocked(bests, 'nether')).toBe(true);
    expect(isUnlocked(bests, 'end')).toBe(false);
  });
  it('ひとつでも アイアンだと ひらかない', () => {
    const bests = { ...all('overworld', 'gold'), 'overworld:items': best('iron') };
    expect(isUnlocked(bests, 'nether')).toBe(false);
    const missing = all('overworld', 'diamond');
    delete missing['overworld:biomes'];
    expect(isUnlocked(missing, 'nether')).toBe(false);
  });
  it('ネザーも ぜんぶ ゴールド いじょうで エンドシティが ひらく', () => {
    expect(isUnlocked({ ...all('overworld', 'gold'), ...all('nether', 'diamond') }, 'end')).toBe(true);
    expect(isUnlocked({ ...all('overworld', 'gold'), ...all('nether', 'stone') }, 'end')).toBe(false);
  });
  it('まえの きろくの なまえを ひきつぐ', () => {
    const m = migrateBests({ 'practice:items': best('gold'), advanced: best('iron'), intermediate: best('gold'), 'beginner:items': best('gold') });
    expect(Object.keys(m).sort()).toEqual(['end', 'overworld:items']);
  });
});

describe('TypingSession', () => {
  it('正解・ミス・終了を判定する', () => {
    const s = new TypingSession([
      { text: 'ab', ja: '', tag: '', icon: '' },
      { text: 'c', ja: '', tag: '', icon: '' },
    ]);
    s.start(0);
    expect(s.input('a', 100)).toBe('correct');
    expect(s.input('x', 200)).toBe('miss');
    expect(s.input('b', 300)).toBe('wordDone');
    expect(s.input('c', 60_000)).toBe('finished');
    expect(s.input('c', 60_001)).toBe('ignored');
    expect(s.missMap.get('b')).toBe(1);
    const r = calcResult(s);
    expect(r.correct).toBe(3);
    expect(r.misses).toBe(1);
    expect(r.accuracy).toBeCloseTo(0.75);
    expect(r.kpm).toBeCloseTo(3);
  });
});

describe('キーボード', () => {
  it('JIS配列の Shift と ゆび', () => {
    expect(findKey('@')!.shift).toBe(false);
    expect(findKey('_')!.shift).toBe(true);
    expect(findKey('^')!.shift).toBe(false);
    expect(findKey('a')!.finger).toBe('lp');
    expect(findKey('1')!.finger).toBe('lp');
    expect(findKey('j')!.finger).toBe('ri');
  });
});
