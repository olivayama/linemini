# コンポーネント配置

`apps/web/components/` 配下のどこにコンポーネントを置くかの判断基準。
判定軸は「**ドメイン(アプリ・案件固有のロジックや文脈)に紐付くか**」。
境界は曖昧なので厳密に分類しようとせず、迷うものは `ui/` の外に寄せる(後で純粋 UI と判断できたら `ui/` へ移せばよい)。

## 置き場所

- **`components/ui/`**: ドメインに紐付かない純粋な UI(プリミティブ)
  - shadcn の CLI で導入するもの(magicui 等の shadcn 互換レジストリ含む)
  - shadcn 由来を純粋な UI の範囲で改造したもの
  - 自作でも、ドメインに依存しない純粋な UI(例: `remote-image.tsx`, `data-table-pagination.tsx`)
- **`components/`(`ui/` の外)**: ドメイン(アプリ・案件固有)に紐付くコンポーネント
  - 例: `line-login-button.tsx`, `require-session.tsx`, `tutorial.tsx`
  - 必要に応じてサブディレクトリにまとめてよい(例: `components/admin/`, `components/bottom-navigation/`)

## `ui/` の外に出すシグナル

次のどちらかに触り出したら「プリミティブ」ではなくなるので `ui/` の外へ:

- **名前が表す範囲の外側の見た目に触る**: 例) ボタンなのにボタンの外にメッセージや進捗バーを描画する
- **アプリ的な振る舞いに触る**: 例) `router.back` などのナビゲーション、データ取得・ファイル生成などドメイン副作用

該当例: 進捗付きダウンロードボタン(ボタン外に進捗を描画＋ファイル生成)は `admin/` 配下へ。`router.back` する戻るボタンも `ui/` の外。

## 判断の基本

- **ドメインに紐付くコンポーネントを `components/ui/` に新規作成しない**
- `ui/` 内の部品が上記シグナルに触れて育ったら `ui/` の外へ移す
- 迷ったら `ui/` の外に置く

## 参考

- 構成の参考: https://github.com/entermotion-jp/osmanthus/tree/main/apps/web/components
