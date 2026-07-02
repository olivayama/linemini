# Testyama

## Git Branches

| AppEnv    | Git Branch | Comment                                      |
| --------- | ---------- | -------------------------------------------- |
| localhost | -          | -                                            |
| snd       | snd        | 動作検証で必要な際に一時的に起動し、削除する |
| dev       | dev        | -                                            |
| stg       | stg        | -                                            |
| prd       | prd        | -                                            |

## LINE Mini Apps

| AppEnv    | エンドポイントURL                             | LIFF URL                                      |
| --------- | --------------------------------------------- | --------------------------------------------- |
| localhost | https://localhost/mini                        | https://liff.line.me/2001316806-PRr3VeXl/home |
| snd       | https://www.snd.example.lineminiapps.com/mini | https://miniapp.line.me/xxxsndliffidxxx/home  |
| dev       | https://www.dev.example.lineminiapps.com/mini | https://miniapp.line.me/xxxdevliffidxxx/home  |
| stg       | https://www.stg.example.lineminiapps.com/mini | https://miniapp.line.me/xxxstgliffidxxx/home  |
| prd       | https://www.example.lineminiapps.com/mini     | https://miniapp.line.me/xxxprdliffidxxx/home  |

## Admin

| AppEnv    | URL                                            |
| --------- | ---------------------------------------------- |
| localhost | https://localhost/admin                        |
| snd       | https://www.snd.example.lineminiapps.com/admin |
| dev       | https://www.dev.example.lineminiapps.com/admin |
| stg       | https://www.stg.example.lineminiapps.com/admin |
| prd       | https://www.example.lineminiapps.com/admin     |

# 初期設定

初期設定の手順については[こちら](./init/README.md)

# トラブルシューティング

## `make setup` や `make up` が正常に完了しない場合

miniappテンプレートのローカル開発環境構築コマンド (`make setup` や `make up` など) が失敗する場合、お使いのPCのネットワークフィルタ「Netskope」が影響している可能性があります。

[Netskope](https://digitalholdings.service-now.com/sp?id=kb_article_view&sysparm_article=KB0010869)が有効になっていると、特定の通信がブロックされ、処理が正常に進まないことがあります。

**確認と対処法:**

1.  **Netskopeの確認**:

    - macOS: 「システム環境設定」 > 「ネットワーク」 > 「フィルタ」
    - Windows: 「設定」 > 「ネットワークとインターネット」 (Netskopeクライアントアプリの設定を確認する場合もあります)
      などでNetskopeが有効になっていないか確認してください。

2.  **対処法**:
    Netskopeが原因である可能性が高い場合、社内規定に従い「[Netskope権限変更申請](https://digitalholdings.service-now.com/sp/?id=sc_cat_item&sys_id=6489f0eddbff8950b7c2f7a3f39619c0&sysparm_category=4fd8f382db4ab810a64e044cd3961967)」を行い、開発作業中に一時的にNetskopeを無効化（OFFに）できるよう手続きをしてください。
    権限が付与された後、Netskopeを無効化し、再度コマンドの実行をお試しください。
