# コード配置（apps/web）

関数・モジュール・hook をどこに置くか。**唯一の禁則は「behavior contract を持つ業務ロジックを画面コンポーネントにインライン放置すること」**。別ファイルに切り出してあれば、置き場は「共有範囲」で決める（切り出し自体が「抽出済み＝テスト対象」を明示する）。

## 置き場

- **`stdutils/`** — 案件非依存の汎用プリミティブ（array / date / string / option / grapheme / intl / query / error / wait-for-cookie 等）。副作用やブラウザ API 結合（wait-for-cookie の `document.cookie` 等）があってもよい。litmus は「**案件・特定アプリ固有の知識を持たず、他プロジェクトにそのまま持っていけるか**」。
- **`utils/`** — **複数画面で共有する**案件業務ロジック + アプリ全体インフラ（案件・特定アプリ固有の知識を持つもの。例: session-manager〔アプリ固有の Session 形〕/ gtm-events〔案件の計測プラン〕/ 横断の業務バリデーション）。`next/headers` 等の環境結合は付随事情で決め手ではない（環境結合だけなら stdutils もありうる = wait-for-cookie）。
- **`hooks/`** — React フック。単発フックだけでなく**フック中心の凝集モジュール**（barrel 付きフォルダ）もここ（例: `hooks/platform/`）。
- **`app/`** — 画面実装（page / layout / route + 画面固有コンポーネント・グルー）。**単一画面でしか使わない業務ロジックは、画面の隣に colocation してよい**（例: `app/mini/orders/validate-coupons.ts` + `.test.ts`）。インライン放置せず別ファイルにする点だけ守る。

## ルール

1. **インライン放置だけが禁則** — behavior contract（入力 → 出力のルール）を持つ業務ロジックは、画面コンポーネントに**インライン放置せず別ファイルに切り出す**。切り出してあれば `app/` 配下に colocation していても**一級のテスト対象**（テスト機構は「ディレクトリ」ではなく「ファイル / 内容」で拾う。[testing.md](./testing.md) 参照）。behavior contract を持たない trivial な画面ロジックはインラインのままでよい。
2. **置き場は「共有範囲」で決める** — 単一画面でしか使わない → **画面の隣に colocation**、複数画面で共有 or アプリ全体インフラ → `utils/`、案件非依存の汎用 → `stdutils/`、フック → `hooks/`。後から横断利用が必要になったら colocation → `utils/` に昇格するだけ。
3. **凝集モジュール（barrel を持つフォルダ単位の塊）は砕かない** — その塊の**支配的な役割**で 1 箇所に置く。内部のサブ部品（pure core 等）を分類のために外へ出さない。
   - 例: `platform/`（`parse.ts` 純粋 → `index.ts` accessor → `use-platform.ts` フック、barrel で公開）は主役が `usePlatform()` なので**塊ごと `hooks/platform/`**。
   - サブ部品の外出しは**独立した再利用を獲得した時だけ**（YAGNI）。将来 platform と無関係に UA パースが要れば、その時 `parse.ts` を `stdutils/` へ昇格する。
4. **置き場とテスト有無は独立軸** — 置き場は上記、テストは「behavior contract があるか」で決める（[testing.md](./testing.md)）。例: `gtm-events` は `utils/` だがテスト無し（薄いラッパー）、`validateXxx` はテスト有り。**切り出しても behavior contract が薄ければテストは書かなくてよい**。
5. **`app/config.ts` は app 全体設定** — 画面固有ではなく、`utils/` / `stdutils/` から import されてよい（この向きの依存は許容。例: `utils/gtm-events.ts` → `@/app/config`）。

## なぜ「インライン放置」だけを禁じるのか

業務ロジックを画面コンポーネントにインライン放置すると、埋もれてテストされなくなる（roco 期の「面倒な割に効かないテスト」への逆戻り）。**別ファイルに切り出すこと自体**（colocation でも `utils/` でも可）が「抽出済み＝テスト対象」を明示し、抽出を後押しする。切り出しは低セレモニー（フラット投入でよく、`utils/` 内や画面隣での小分けは最初は決めなくてよい）なのでコストは小さい。テスト機構（doc-gen / 自動テストトリガー）も「ディレクトリ」ではなく「ファイル / 内容」で拾うので、colocation でも漏れない（[testing.md](./testing.md) の Why 参照）。この方針が効くのは重い FE 業務ロジックがある案件（例: `validateOrderCoupons` 級）で、軽い画面ロジックは trivial＝インラインでよい。
