# クラフト タイピング

マインクラフト統合版（Bedrock Edition）のコマンドや ID を打って練習する、子ども向けのタイピングゲームです。

## あそびかた

```bash
npm install
npm run dev      # 開発サーバー (http://localhost:5173)
npm run build    # dist/index.html 1ファイルにまとめて出力（ダブルクリックで開ける）
npm test         # データとロジックのテスト
```

| エリア | 内容 | 解禁条件 |
|---|---|---|
| オーバーワールド | 8グループ。ID を「_」で分けた短い英単語を打つ（`diamond_sword` → `diamond` と `sword`。同じ単語は1回だけ）。意味は `src/data/parts.ts` | 最初から |
| ネザー | 2グループずつ混ぜた4ステージ。「_」入りの ID をそのまま打つ（半分ずつ出題） | オーバーワールド8つすべてをゴールドランク以上 |
| エンドシティ | ID を組み合わせた本物のコマンド文を打つ（例: `/give @p diamond_sword 1`、`/kill @e[type=zombie]`） | ネザー4つすべてをゴールドランク以上 |

- ネザーのステージ分けは `src/questions.ts` の `NETHER_STAGES`、解禁ルールは `src/progress.ts` で変えられます
- 大人の動作確認用に、URL の最後に `?unlock` をつけると全エリアが開きます（記録は変わりません）

- 問題はいつも10問。キーボードは JIS 配列、音は出ません
- 次に押すキーと使う指を画面のキーボード（JIS 配列）で案内します
- 日本語入力がオンのとき・CapsLock がオンのときは警告を出します
- 結果はスコアでランク（ウッド〜ネザライト）がつき、苦手なキーを表示します。自己ベストはブラウザに保存されます

## 公開（GitHub Pages）

main に push すると、GitHub Actions（`.github/workflows/deploy.yml`）がテストとビルドを行い、
https://minoru-github.github.io/typing-game/ に公開します。
テストが失敗したときは公開されません。

## 単語グループ

`src/data/groups.ts` で編集できます。

- コマンド / アイテム / ブロック / エンティティ
- エフェクト（`speed`, `night_vision` …）
- エンチャント（`sharpness`, `mending` … 最大レベル付き）
- バイオーム（`plains`, `cherry_grove` … 統合版の ID 名: `roofed_forest`, `swampland`, `hell` など）
- ゲームルール（`keepinventory` … 統合版は小文字表記）

エンドシティのコマンド文のテンプレートは `src/questions.ts` の `TEMPLATES` にあります。
