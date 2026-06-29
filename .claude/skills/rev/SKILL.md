---
name: rev
description: PR のコードレビューを実施（初見・追加レビュー両対応）
disable-model-invocation: true
---

# rev (PR レビュー)

## トリガー

- `/rev <PR URL>`

## 実行手順

1. `.claude/docs/rev/README.md` を読む
2. PR 情報と既存の指摘・コメントを、解決済みスレッドも含めて全て読んで文脈を把握する
3. PR 説明に Notion リンクがある場合は Notion MCP で中身を確認（仕様・背景の把握）
4. PR 説明に Figma リンクがある場合は Figma MCP で中身を確認（デザイン・文言の照合）
5. ローカルコードを確認してレビュー（テンプレ追従(tsync)PR は、テンプレ現行ツリー全体との差分でも取りこぼしを照合する → README「レビュー方針 > テンプレ追従(tsync)PR の場合」）
6. 指摘事項を README の「指摘の構成要素」に沿ってリスト化（既存指摘と重複するものは除外）

## 制約

- **レビューコメントの投稿は行わない**
