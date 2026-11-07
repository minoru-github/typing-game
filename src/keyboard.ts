/** 画面に出すキーボード（JIS配列） */

type KeyDef = readonly [base: string, shift?: string];

const letters = (s: string): KeyDef[] => [...s].map((c) => [c, c.toUpperCase()] as const);

const ROWS: readonly (readonly KeyDef[])[] = [
  [['1', '!'], ['2', '"'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '&'], ['7', "'"], ['8', '('], ['9', ')'], ['0'], ['-', '='], ['^', '~'], ['¥', '|']],
  [...letters('qwertyuiop'), ['@', '`'], ['[', '{']],
  [...letters('asdfghjkl'), [';', '+'], [':', '*'], [']', '}']],
  [...letters('zxcvbnm'), [',', '<'], ['.', '>'], ['/', '?'], ['\\', '_']],
];

/** 行の左にあるキー（Tab, Caps など）の幅 */
const INDENT = [0, 1.5, 1.8, 2.3];

type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'th';

const FINGER_JA: Record<Finger, string> = {
  lp: 'ひだりの こゆび',
  lr: 'ひだりの くすりゆび',
  lm: 'ひだりの なかゆび',
  li: 'ひだりの ひとさしゆび',
  ri: 'みぎの ひとさしゆび',
  rm: 'みぎの なかゆび',
  rr: 'みぎの くすりゆび',
  rp: 'みぎの こゆび',
  th: 'おやゆび',
};

/** JIS配列では どの行も 左から おなじ ゆびの ならび */
function fingerOf(col: number): Finger {
  if (col <= 0) return 'lp';
  if (col === 1) return 'lr';
  if (col === 2) return 'lm';
  if (col <= 4) return 'li';
  if (col <= 6) return 'ri';
  if (col === 7) return 'rm';
  if (col === 8) return 'rr';
  return 'rp';
}

export interface KeyPos {
  row: number;
  index: number;
  shift: boolean;
  finger: Finger;
}

export function findKey(ch: string): KeyPos | null {
  if (ch === ' ') return { row: 4, index: 0, shift: false, finger: 'th' };
  const rows = ROWS;
  for (let row = 0; row < rows.length; row++) {
    for (let index = 0; index < rows[row].length; index++) {
      const [base, shift] = rows[row][index];
      if (base === ch || shift === ch) {
        return { row, index, shift: base !== ch, finger: fingerOf(index) };
      }
    }
  }
  return null;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function keyboardHtml(): string {
  const rows = ROWS;
  const html = rows.map((keys, row) => {
    const parts: string[] = [];
    if (row === 3) parts.push(`<div class="key mod" data-shift="L" style="--w:${INDENT[3]}">Shift</div>`);
    else if (INDENT[row]) parts.push(`<div class="key mod" style="--w:${INDENT[row]}"></div>`);
    keys.forEach(([base, shift], index) => {
      const isLetter = /[a-z]/.test(base);
      const label = isLetter ? base.toUpperCase() : base;
      const sub = !isLetter && shift ? `<span class="sub">${escapeHtml(shift)}</span>` : '';
      const f = fingerOf(index);
      const home = row === 2 && (base === 'f' || base === 'j') ? ' home' : '';
      parts.push(
        `<div class="key f-${f}${home}" data-k="${row}-${index}">${sub}<span class="main">${escapeHtml(label)}</span></div>`,
      );
    });
    if (row === 3) parts.push(`<div class="key mod grow" data-shift="R">Shift</div>`);
    return `<div class="kb-row">${parts.join('')}</div>`;
  });
  html.push(`<div class="kb-row"><div class="key f-th space" data-k="4-0" style="--w:7">スペース</div></div>`);
  return `<div class="keyboard">${html.join('')}</div>`;
}

/** 次に押すキーを光らせる。指のヒントを返す */
export function highlight(root: HTMLElement, ch: string | undefined): string {
  root.querySelectorAll('.key.next').forEach((el) => el.classList.remove('next'));
  if (ch === undefined) return '';
  const pos = findKey(ch);
  if (!pos) return '';
  root.querySelector(`[data-k="${pos.row}-${pos.index}"]`)?.classList.add('next');
  const name = ch === ' ' ? 'スペース' : `「${ch}」`;
  let hint = `つぎは ${name}：${FINGER_JA[pos.finger]}`;
  if (pos.shift) {
    const leftHand = pos.finger.startsWith('l');
    // 打つ指と反対の手で Shift を押す
    root.querySelector(`[data-shift="${leftHand ? 'R' : 'L'}"]`)?.classList.add('next');
    hint += `（${leftHand ? 'みぎ' : 'ひだり'}の Shift を おしながら）`;
  }
  return hint;
}
