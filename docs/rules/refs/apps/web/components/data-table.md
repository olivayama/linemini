# DataTable(列定義)

`@tanstack/react-table` の `ColumnDef` を書く際の規約。

## 実フィールドに対応しない列は `accessorKey` でなく `id`

`accessorKey` は「値アクセサ＋列 id」を兼ねるため、行データのトップレベルに存在しないキーを `accessorKey` に置くと、値アクセサが空回りし(ソート / フィルタが機能しない)、`row.xxx` 直接アクセスを示唆して誤読も招く。`cell` / `accessorFn` で描画する列は、識別子だけを表す `id` を使う。

## null セルは `?? '-'` で埋めない

`cell` で null / undefined になり得る値を表示するとき、`?? '-'` 等のプレースホルダでフォールバックしない。null はそのまま空セルにする。content-preview シートに渡す値も同様。

## columns はコールバックを受けるファクトリにしない

columns はモジュール const として定義する。セルが別クエリ由来の外部データを参照する場合のみ、コンポーネント内の素の `const`(closure 参照)にする。`const columns = (onDeleteSuccess) => [...]` のようにコールバックを引数で受けるファクトリ関数にしない。

行削除も親から columns 経由でコールバックを渡さず、行アクションの子コンポーネント(`ActionDropdownMenu` 等)が自前の `useMutation` + `onSuccess: () => location.reload()` で一覧更新まで完結させる。
