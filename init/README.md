# 初期設定

## 文字列置換

| 変換前                       | 変換後                           | 形式                     | 使用箇所         |
| ---------------------------- | -------------------------------- | ------------------------ | ---------------- |
| xxxcodenamexxx               | コードネーム                     | 英小文字                 |                  |
| xxxcapitalizedcodenamexxx    | 先頭を大文字にしたコードネーム   | 英字                     |                  |
| 2001316806-PRr3VeXl          | localhost liffId                 | 0000000000-XXXXXXXX      |                  |
| xxxsndliffidxxx              | snd liffId                       | 0000000000-XXXXXXXX      |                  |
| xxxdevliffidxxx              | dev liffId                       | 0000000000-XXXXXXXX      |                  |
| xxxstgliffidxxx              | stg liffId                       | 0000000000-XXXXXXXX      |                  |
| xxxprdliffidxxx              | prd liffId                       | 0000000000-XXXXXXXX      |                  |
| xxxawsaccountidxxx           | AWS アカウント ID                | 000000000000             |                  |
| miniapp.line.me              | liff アプリの場合は liff.line.me | xxx.line.me              |                  |
| example.lineminiapps.com     | ドメイン                         | ドメイン                 |                  |
| xxxbrandnamexxx              | ブランド名                       | 英小文字                 |                  |
| xxxappnamexxx                | アプリ名                         | アプリ名                 |                  |
| https://official.example.com | 公式サイトURL                    | URL                      | その他画面       |
| xxxagencynamexxx             | 事務局名                         | XXXXXXXXXXX事務局        | お問い合わせ画面 |
| xxxagencytelxxx              | 事務局電話番号                   | 0000-000-000             | お問い合わせ画面 |
| xxxagencyhoursxxx            | 事務局受付時間                   | 0:00 ~ 0:00              | お問い合わせ画面 |
| xxxcompanynamexxx            | 会社名                           | XXXXXXXXXXXXXXXX株式会社 | お問い合わせ画面 |
| https://privacy.example.com  | プライバシーポリシーURL          | URL                      | お問い合わせ画面 |

## 画像差し替え

| ファイル                                                        | 説明                 | 使用箇所                       |
| --------------------------------------------------------------- | -------------------- | ------------------------------ |
| apps/web/public/mini/assets/images/onboarding/onboarding-bg.png | オンボーディング背景 | オンボーディング               |
| apps/web/public/mini/assets/images/tutorial/tutorial-1.png      | チュートリアル1枚目  | チュートリアル                 |
| apps/web/public/mini/assets/images/tutorial/tutorial-2.png      | チュートリアル1枚目  | チュートリアル                 |
| apps/web/public/mini/assets/images/tutorial/tutorial-3.png      | チュートリアル1枚目  | チュートリアル                 |
| apps/web/public/mini/assets/images/logos/app-logo.png           | アプリロゴ           | ローディング、オンボーディング |
| apps/web/public/admin/assets/images/logos/app-logo.png          | アプリロゴ           | 管理画面ヘッダー               |

## LIFF エンドポイントパスの確認

LIFF の Endpoint URL のパス部分（例: `https://www.example.lineminiapps.com/mini` の `/mini`）と `apps/web/app/config.ts` の `liffEndpointPathname` を一致させる。

不一致の場合、`liff.login()` 後の 2 次リダイレクトが正常に行なわれず、URL から認証情報が除去されないままアプリが起動する不具合が発生する（詳細は `apps/web/providers/liff-provider.tsx` の `login` 関数のコメント参照）。

デフォルトは `/mini`。Endpoint URL を `/mini` 以外で運用する場合のみ `liffEndpointPathname` を変更する。

## 管理画面の年月フィルタ起点月

ユーザー一覧・CSV の年月フィルタ（`apps/web/components/admin/year-month/year-month-select.tsx`）の選択肢は、起点月から当月までを生成する。この起点月 `startDate` は案件ごとにサービス開始月（または最古データの年月）へ調整する。

該当箇所は `generateMonthOptions` 内の以下の行。

```ts
const startDate = new Date(2025, 8) // 月は 0 始まり（8 = 9 月）。例: 2025-09 起点
```

デフォルトは `2025-09`。起点より前の年月は選択肢に出ないため、サービス開始月に合わせて設定する。

## 管理画面アクティベーションキー（監査対応案件のみ）

監査対応案件で `/admin/*` を obscurity で隠す要件がある場合のみ設定する。詳細・rationale は [管理画面の Cookie ベースアクティベーション](../docs/rules/refs/apps/web/admin-protection.md)。

1. `openssl rand -hex 8` でキーを生成（`'admin'` 文字列を含めないこと）
2. `apps/web/app/config.server.ts` の `adminUrlKeyByEnv` に env ごとのキーを設定（通常 `stg` / `prd` のみ）
3. リポジトリ直下の `README.md` の Admin セクションの URL を `?__admin-key={key}` 付きに更新
