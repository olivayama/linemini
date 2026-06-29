# push 前の整形

未整形・自動修正可能な lint 違反を含むコミットを push すると、CI の `Lint` / `Check format` ジョブで落ちる。push 前にローカルで解消する。

## ルール

- `git push` の前に `make fix`(eslint/prettier 自動修正) を実行し、差分が出たら push 対象のコミットに含める
- 直前に `make fix`、または lint と format の両チェック(`pnpm run lint` と `pnpm run format`)を実行して問題がなく、それ以降コードを変更していない場合は省略してよい

## 対象外

- tpush のような別リポジトリ / 別ワークツリーへの push には適用しない(このリポジトリで `make fix` を実行しても push 内容には影響しないため。整形漏れは push 先の CI で検知される)

## 注意

- `make fix` が解消するのは eslint/prettier の自動修正のみ。tsc 型エラーや自動修正不能な lint エラーは含まれない(CI で検知されたら都度修正する)
