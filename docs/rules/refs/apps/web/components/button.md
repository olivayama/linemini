# Button

- `components/ui/button.tsx` の `Button` を使用する
- cva で複数バリアント (`variant`) とサイズ (`size`) ベースのスタイルを定義

## 色の指定方法

`buttonVariants` 内で各 `variant` (例: `default`) にTailwindユーティリティ (`bg-*`, `text-*`等) で色を指定。ユーティリティはCSS変数や `tailwind.config.ts` の色を参照

- 例: `default: 'bg-primary text-primary-foreground hover:bg-primary/90'`

## コンポーネント使用時

`<Button variant="secondary" />` の様に `variant` propでスタイル適用

## 色のカスタマイズ

新規色は `buttonVariants` に追加、または `className` propでTailwindユーティリティを直接使用/上書き

- 例: `<Button variant="default" className="bg-blue-500 hover:bg-blue-600" />`

## 遷移を伴うボタン

- 遷移を伴うボタンは `next/link` の `<Link>` または `components/link-button.tsx` の `LinkButton` を使う。`<button onClick={() => router.push(...)}>` にしない (Next.js の prefetch とリンクのセマンティクスを失うため)
- 副作用 (localStorage クリア等) が必要な場合は `<Link>` / `LinkButton` に `onClick` を渡す。`LinkButton` は `asChild` + Slot 経由で内部の `next/link` まで `onClick` を転送する
- 純粋なイベント発火のみ (form submit 等) は `<Button>` / `<button>` を使う
