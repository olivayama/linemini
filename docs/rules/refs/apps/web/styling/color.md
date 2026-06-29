# 色

## 色の定義

### 基本色の定義

`globals.css` の `:root`, `.dark` セレクタ内でHSL形式CSS変数として定義

- 例: `--background`, `--foreground`, `--primary` 等
- ライト/ダークモードのカラースキームを定義

CSS変数は `tailwind.config.ts` の `theme.extend.colors` で参照、Tailwindユーティリティ (例: `bg-background`) 化。例: `background: 'hsl(var(--background))'`

### 特定のコンポーネント用の色

特定コンポーネント/外部サービス色は `tailwind.config.ts` の `theme.extend.colors` に直接定義

- 例: `colors.line.background: '#06C755'`

## 背景色の使用

### グローバルな背景色

`globals.css` の `body` に `bg-background` を適用し、CSS変数 `--background` をデフォルト背景色に設定

### コンポーネントごとの背景色

コンポーネント毎の背景色はTailwindユーティリティで指定

- 例: `className="bg-primary"`, `className="bg-card"`

`tailwind.config.ts` のカスタムカラー (例: `bg-line-background`) も使用可。背景画像は `globals.css` でカスタムクラスと `background-image` を使用 (例: `.bg-onboarding`)
