import './style.css';
import { GROUPS } from './data/groups';
import { Mode, NETHER_STAGES, Question, buildQuestions, modeKey, modeLabel, netherStageName, practiceQuestions } from './questions';
import { TypingSession } from './session';
import { highlight, keyboardHtml } from './keyboard';
import { Best, loadBests, saveBest } from './storage';
import { RANKS, calcResult } from './result';
import { Area, CLEAR_RANK_ID, PREV_AREA, areaProgress, isCleared, isUnlocked } from './progress';

const app = document.querySelector<HTMLDivElement>('#app')!;

/** URL に ?unlock を つけると ぜんぶ かいほう（おとな・かくにん用） */
const UNLOCK_ALL = new URLSearchParams(location.search).has('unlock');

// ---------- 共通 ----------

let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let cleanup: (() => void) | null = null;

function setScreen(html: string, onKey: ((e: KeyboardEvent) => void) | null): void {
  cleanup?.();
  cleanup = null;
  app.innerHTML = html;
  keyHandler = onKey;
  window.scrollTo(0, 0);
}

window.addEventListener('keydown', (e) => keyHandler?.(e));

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const rankName = (id: string) => RANKS.find((r) => r.id === id)?.name ?? '';
const CLEAR_RANK_NAME = rankName(CLEAR_RANK_ID);

const AREA_NAME: Record<Area, string> = { overworld: 'オーバーワールド', nether: 'ネザー', end: 'エンドシティ' };

/** もんだいの かずは いつも 10もん */
const QUESTION_COUNT = 10;

function bestBadge(bests: Record<string, Best>, mode: Mode): string {
  const b = bests[modeKey(mode)];
  if (!b) return '';
  const clear = isCleared(bests, mode) ? '<span class="clear-mark">✔ クリア</span>' : '';
  return `<span class="best-row"><span class="best rank-${b.rankId}" title="じこベスト">${rankName(b.rankId)} ${b.score}</span>${clear}</span>`;
}

// ---------- タイトル画面 ----------

function showTitle(): void {
  const bests = loadBests();
  const modes: Mode[] = [];
  const modeAttr = (m: Mode) => `data-m="${modes.push(m) - 1}"`;

  const areaHead = (area: Area, sub: string) => {
    const p = areaProgress(bests, area);
    return `<h2><span class="lv">${AREA_NAME[area]}</span> ${sub}<span class="progress">${p.done} / ${p.total} クリア</span></h2>`;
  };

  const lockNote = (area: Area) => {
    const prev = PREV_AREA[area]!;
    const p = areaProgress(bests, prev);
    return `<div class="lock-note">🔒 ${AREA_NAME[prev]}を ぜんぶ ${CLEAR_RANK_NAME}ランク いじょうで クリアすると ひらくよ（いま ${p.done} / ${p.total}）</div>`;
  };

  const overworldButtons = GROUPS.map((g) => {
    const list = practiceQuestions(g.key);
    const mode: Mode = { kind: 'overworld', group: g.key };
    return `
      <button class="group-btn" ${modeAttr(mode)}>
        <span class="g-icon">${g.icon}</span>
        <span class="g-name">${esc(g.name)} <span class="g-count">${list.length}こ</span></span>
        <span class="g-desc">${esc(list.slice(0, 3).map((q) => q.text).join(', '))} …</span>
        ${bestBadge(bests, mode)}
      </button>`;
  }).join('');

  const netherOpen = isUnlocked(bests, 'nether', UNLOCK_ALL);
  const netherButtons = NETHER_STAGES.map((s, stage) => {
    const mode: Mode = { kind: 'nether', stage };
    const [a, b] = s.groups.map((k) => GROUPS.find((g) => g.key === k)!);
    return `
      <button class="group-btn stage-btn" ${modeAttr(mode)} ${netherOpen ? '' : 'disabled'}>
        <span class="g-icon">${a.icon}${b.icon}</span>
        <span class="g-name">ステージ${stage + 1} <span class="g-count">${a.words.length + b.words.length}こ</span></span>
        <span class="g-desc">${esc(netherStageName(stage))}</span>
        ${bestBadge(bests, mode)}
      </button>`;
  }).join('');

  const endOpen = isUnlocked(bests, 'end', UNLOCK_ALL);
  const endMode: Mode = { kind: 'end' };


  setScreen(
    `
    <header class="hero">
      <h1><span class="block grass"></span>クラフト タイピング</h1>
      <p>マイクラ統合版の コマンドや ID を うって、タイピング名人を めざそう!</p>
    </header>

    <p class="note">※ ゲームの まえに にほんご にゅうりょくを オフ（えいすう）に してね。</p>

    <section class="panel area area-overworld">
      ${areaHead('overworld', '「_」の ない みじかい ことば')}
      <p class="lead"><code>diamond_sword</code> → <code>diamond</code> と <code>sword</code> に わけて うつよ</p>
      <div class="groups">${overworldButtons}</div>
    </section>

    <section class="panel area area-nether ${netherOpen ? '' : 'locked'}">
      ${areaHead('nether', '2つの グループの ID を まぜて うとう')}
      ${netherOpen ? '' : lockNote('nether')}
      <div class="groups stages">${netherButtons}</div>
    </section>

    <section class="panel area area-end ${endOpen ? '' : 'locked'}">
      ${areaHead('end', 'ほんものの コマンドを くみたてよう')}
      ${endOpen ? '' : lockNote('end')}
      <button class="group-btn end-btn" ${modeAttr(endMode)} ${endOpen ? '' : 'disabled'}>
        <span class="g-icon">⌨️</span>
        <span class="g-name">コマンド チャレンジ</span>
        <span class="g-desc"><code>/give @p diamond_sword 1</code> <code>/kill @e[type=zombie]</code> …</span>
        ${bestBadge(bests, endMode)}
      </button>
    </section>
    `,
    null,
  );

  app.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) =>
    b.addEventListener('click', () => showPlay(modes[Number(b.dataset.m)])),
  );
}


// ---------- プレイ画面 ----------

function wordHtml(text: string, pos: number): string {
  return [...text]
    .map((c, i) => {
      const cls = i < pos ? 'done' : i === pos ? 'cur' : 'todo';
      return c === ' '
        ? `<span class="ch sp ${cls}">␣</span>`
        : `<span class="ch ${cls}">${esc(c)}</span>`;
    })
    .join('');
}

function showPlay(mode: Mode): void {
  const questions: Question[] = buildQuestions(mode, QUESTION_COUNT);
  const session = new TypingSession(questions);
  let started = false;
  let timer = 0;

  setScreen(
    `
    <div class="play">
      <div class="play-head">
        <button class="back">◀ もどる <small>(Esc)</small></button>
        <div class="mode">${esc(modeLabel(mode))}</div>
        <div class="clock">0.0 びょう</div>
      </div>
      <div class="xp"><div class="xp-fill"></div><span class="xp-text"></span></div>
      <div class="card">
        <div class="tag"></div>
        <div class="ja"></div>
        <div class="word"></div>
        <div class="hint"></div>
      </div>
      <div class="warn" hidden></div>
      ${keyboardHtml()}
      <div class="start-overlay">
        <div class="start-box">
          <p>${esc(modeLabel(mode))}</p>
          <p class="big">スペースキーで スタート!</p>
          <p class="small">にほんご にゅうりょくは オフ（えいすう）に してね</p>
        </div>
      </div>
    </div>`,
    onKey,
  );

  const $ = <T extends HTMLElement>(s: string) => app.querySelector<T>(s)!;
  const card = $('.card');
  const warn = $('.warn');
  const overlay = $('.start-overlay');
  const clock = $('.clock');
  $('.back').addEventListener('click', showTitle);

  function render(): void {
    const q = session.current;
    const done = session.qIndex;
    $('.xp-fill').style.width = `${(done / questions.length) * 100}%`;
    $('.xp-text').textContent = `${Math.min(done + 1, questions.length)} / ${questions.length}`;
    if (!q) return;
    $('.tag').textContent = `${q.icon} ${q.tag}`;
    $('.ja').textContent = q.ja;
    const word = $('.word');
    word.classList.toggle('long', q.text.length > 22);
    word.innerHTML = wordHtml(q.text, session.pos);
    $('.hint').textContent = highlight(app, session.expected);
  }

  function showWarn(msg: string | null): void {
    warn.hidden = !msg;
    warn.textContent = msg ?? '';
  }

  function flash(cls: 'shake' | 'pop'): void {
    card.classList.remove(cls);
    void card.offsetWidth; // アニメーションをやり直す
    card.classList.add(cls);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      showTitle();
      return;
    }
    if (e.isComposing || e.key === 'Process' || e.keyCode === 229) {
      showWarn('にほんご にゅうりょくが オンに なっているよ。「半角/全角」キーで えいすうに してね!');
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
    e.preventDefault(); // スペースでのスクロールや「/」でのページ内検索をふせぐ

    if (!started) {
      if (e.key === ' ') {
        started = true;
        overlay.remove();
        session.start(performance.now());
        timer = window.setInterval(() => {
          clock.textContent = `${((performance.now() - session.startedAt) / 1000).toFixed(1)} びょう`;
        }, 100);
        render();
      }
      return;
    }

    const expected = session.expected;
    const res = session.input(e.key, performance.now());
    if (res === 'miss') {
      flash('shake');
      const caps = e.getModifierState?.('CapsLock') && expected && e.key === expected.toUpperCase() && e.key !== expected;
      showWarn(caps ? 'CapsLock（キャプスロック）が オンかも! おおもじに なっているよ' : null);
      return;
    }
    showWarn(null);
    if (res === 'wordDone') flash('pop');
    if (res === 'finished') {
      window.clearInterval(timer);
      showResult(mode, session);
      return;
    }
    render();
  }

  cleanup = () => window.clearInterval(timer);
  render();
}

// ---------- 結果画面 ----------

function showResult(mode: Mode, session: TypingSession): void {
  const r = calcResult(session);
  const key = modeKey(mode);
  const areas: Area[] = ['nether', 'end'];
  const before = loadBests();
  const wasCleared = isCleared(before, mode);
  const isBest = saveBest(key, { score: r.score, rankId: r.rank.id, kpm: Math.round(r.kpm), accuracy: r.accuracy });
  const after = loadBests();
  const newlyOpened = areas.filter((a) => !isUnlocked(before, a) && isUnlocked(after, a));

  let clearMsg = '';
  if (newlyOpened.length) {
    clearMsg = newlyOpened.map((a) => `<div class="unlock">🎉 ${AREA_NAME[a]}が ひらいた! 🎉</div>`).join('');
  } else if (isCleared(after, mode) && !wasCleared) {
    clearMsg = '<div class="cleared">✔ クリア!</div>';
  } else if (!isCleared(after, mode)) {
    clearMsg = `<div class="not-yet">${CLEAR_RANK_NAME}ランク いじょうで クリアだよ!</div>`;
  }

  const weak = r.weakKeys.length
    ? r.weakKeys.map(([k, n]) => `<span class="weak-key">${k === ' ' ? 'スペース' : esc(k)}<small>×${n}</small></span>`).join('')
    : '<span class="perfect">ミス なし! パーフェクト!</span>';

  setScreen(
    `
    <div class="panel result">
      <p class="mode">${esc(modeLabel(mode))}</p>
      <div class="rank-wrap">
        <div class="rank-block rank-${r.rank.id}"></div>
        <div>
          <div class="rank-name">${r.rank.name} ランク</div>
          <div class="rank-msg">${r.rank.message}</div>
          ${isBest ? '<div class="new-best">★ じこベスト こうしん! ★</div>' : ''}
        </div>
      </div>
      ${clearMsg}
      <dl class="stats">
        <div><dt>スコア</dt><dd>${r.score}</dd></div>
        <div><dt>じかん</dt><dd>${r.seconds.toFixed(1)}<small>びょう</small></dd></div>
        <div><dt>はやさ</dt><dd>${Math.round(r.kpm)}<small>もじ/ぷん</small></dd></div>
        <div><dt>せいかくさ</dt><dd>${(r.accuracy * 100).toFixed(1)}<small>%</small></dd></div>
        <div><dt>ミス</dt><dd>${r.misses}<small>かい</small></dd></div>
      </dl>
      <div class="weak"><h3>にがてな キー</h3>${weak}</div>
      <div class="buttons">
        <button class="btn retry">もういちど <small>(Enter)</small></button>
        <button class="btn menu">メニューへ <small>(Esc)</small></button>
      </div>
    </div>`,
    (e) => {
      if (e.key === 'Enter') showPlay(mode);
      if (e.key === 'Escape') showTitle();
    },
  );
  app.querySelector('.retry')!.addEventListener('click', () => showPlay(mode));
  app.querySelector('.menu')!.addEventListener('click', showTitle);
}

showTitle();
