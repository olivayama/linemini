# エージェント作業領域 (Agent Storage)

AI coding agent(Claude Code / Codex 等)がローカルに吐く作業ファイルの置き場所と、残す価値のあるナレッジの昇格ルール。

## .agents/ の使い分け(XDG 準拠)

作業中のファイルは、リポジトリ直下の `./.agents/` 配下に用途で分けて置く。`tmp/` 等のその場限りのパスより優先する。

- `./.agents/cache/` … 使い捨て・再生成可能。codex プロンプト、パッチ、スクリーンショット、テスト成果物
- `./.agents/state/` … ワークフローを再開するための永続的な運用状態
- `./.agents/share/` … 残す/後で読む価値のある、ユーザーにとって意味のある成果物

`.agents/` は `.gitignore` 済み(コミットされない)。各自の global gitignore に頼らず、リポジトリの `.gitignore` で無視する。

Claude Code は `CLAUDE.md` → この `docs/rules` 経由で、Codex はリポジトリ直下の `AGENTS.md` から、同じ規約を読む。

## 昇格 (promotion)

`.agents/` は「とりあえず雑に吐く」緩衝地帯。残す価値があるものだけ、内容に応じた宛先へ昇格する。

- 横断で再利用できる知識・設計判断 → `/knowledge` で保存(後述)
- 再利用する手順・やり方 → skill 化(案件の `.claude/skills/`、汎用なら tpush でテンプレへ)
- 案件固有のルール・規約 → `docs/rules/pj.md` + `refs/`(書き方は `refs/workflow/rule.md`)
- 案件固有の事実・経緯 → プロジェクトの自動メモリ(`~/.claude/projects/<project>/memory/`)か `docs/`

`/knowledge` は保存前に宛先を判定し、`_knowledge/` 該当でなければ上記の該当先を提案する(`_knowledge/` を横断ナレッジ専用に保つ)。

昇格のタイミング: 対話中は知見が出たら `/knowledge` が提案する(自動発動・要確認)。`.agents/share` に貯めた分は、対話の締めや長時間/headless 実行の末尾に `/knowledge`(引数なし)で棚卸しする。単発は `/knowledge <パス>`。

## 個人のナレッジ基盤(外部記憶)

横断ナレッジは `~/.claude/projects/_knowledge/` に **プレーンな md** で蓄積される(`/knowledge` が書く・テンプレ配布のスキル・install 不要)。Claude Code の自動メモリと同じ frontmatter + `[[wikilink]]` 形式なので、普通のエディタ(Cursor / VS Code 等)でそのまま読める。閲覧ツールは自由。

**想起(recall)**: 横断的な判断・ハマりどころに着手する前、または過去の解決策を思い出したいときは、`~/.claude/projects/_knowledge/INDEX.md` の「参照条件」を見て、該当する本文だけ読む(索引だけ見れば軽く、全部は読み込まない)。明示的に過去を探したいときは `_knowledge/` を検索する。

(任意) グラフ・バックリンク・全文検索・モバイルで見たい人は、Obsidian で `~/.claude/projects/` を vault として開くと便利。手順は Notion を参照:
https://www.notion.so/3725fe8d887e816a8516ea079a1a81df
