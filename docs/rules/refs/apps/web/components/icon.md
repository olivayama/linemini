# Icon

## 基本

- `components/icons/index.tsx` の `Icon` を使用する
- アイコンは「読み上げるか / 読み上げないか」を必ず明示する（`alt` または `noAlt`）
  - `noAlt` も `alt` も未指定のまま使わない（`alt` 未指定時は `defaultAlt()` 関数により機械的に生成した英語風の文字列が読み上げられる）
  - `noAlt` と `alt` の同時指定は禁止（`noAlt` が優先され `alt` は無視される）

## noAlt を指定するパターン

装飾的アイコン（次のいずれかで意味がすでに伝わっている）:
- ボタン／リンクなどで **親に `aria-label` または可視テキスト** がある（アイコンのみボタンは親の `aria-label` + 子は `noAlt`）
- **隣接するテキスト** とセット
  - 判定基準: アイコンとテキストが視覚的に一体として認識される配置
    - 同一のコンテナ内（同じdiv、同じボタン等）
    - 隣接する要素（兄弟要素として並んでいる）
    - 明確に関連付けられた親子関係（見出しとその直下の説明等）

## alt を指定するパターン

意味のあるアイコン（**上記がなく、アイコン（またはアイコンだけのブロック）だけで状態を伝える**）:
- `alt` は **画面の言語（本アプリでは日本語）で記述する**
- 実装方法は次のいずれかを選択（同じ目的なので **どちらか一方でよい**）：
  - **方法A**: `alt` で日本語を渡す（例: `<Icon i="progress" alt="読み込み中" />`）
  - **方法B**: `noAlt` + 近傍に `sr-only` 等のテキスト（例: `<Icon i="progress" noAlt /><span className="sr-only">読み込み中</span>`）

## 判定フローチャート

1. 親要素に `aria-label` または可視テキストがある → `noAlt`
   例: `<button aria-label="メニューを開く"><Icon i="menu" noAlt /></button>`
2. 同一視覚グループ内に説明テキストがある（= 隣接するテキストとセットの場合） → `noAlt`
   例: `<div><Icon i="progress" noAlt /><span>処理中...</span></div>`
3. 上記がない → `alt` で日本語説明を追加
   例: `<Icon i="warning" alt="注意" />`（単独で配置されたアイコン）

## NG例・OK例

**NG例**:
- `<Icon i="check" />` （未指定 → "Check" が英語で読み上げられる）
- `<Icon i="mapPinCheck" noAlt alt="位置確認済み" />` （両方指定 → altは無視される）

**OK例**:
- `<button aria-label="保存"><Icon i="check" noAlt /></button>`
- `<Icon i="check" alt="保存完了" />`
- `<Icon i="progress" noAlt /><span>読み込み中…</span>`
