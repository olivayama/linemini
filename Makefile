.PHONY: gen

CODE_NAME := xxxcodenamexxx

## 各タスクのコメントフォーマット

## タイトル
#
# @RequireRunning 起動している必要があるタスク
# @RequireOnce    事前に1回実行しておく必要があるタスク
# @When           実行が必要なタイミング
# @Var            変数名（変数の説明）
# @Example        実行例
#
# * 補足
#

## プロジェクトのセットアップ
#
# * 依存ライブラリのインストール
# * localhost を HTTPS 化するための証明書を作成し、インストール
#
# node-canvasの依存性を先に解決するため、依存ライブラリを先にインストールすること。
# コマンドは右リンクに記載あり。https://github.com/Automattic/node-canvas?tab=readme-ov-file#compiling
# 例) OS Xの場合、brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman　を実行する
setup:
	pnpm i
	(test -f docker/nginx/certs/localhost.pem && echo "localhost certs is already exists") || (mkcert -install && cd docker/nginx/certs && mkcert localhost)

## ESLint/Prettier のエラー/警告を修正する
#
fix:
	pnpm run fix

## テストを実行する
test: test/unit test/ix

## Unit Test を実行する (api: *.test.ts / web: *.test.ts(x))
test/unit:
	pnpm run test

## Integration Test を実行する (api: docker / web: vitest)
# * api (services/*.ix_test.ts) は compose.ix_test.yaml のコンテナ上で実行する (DB が要る)
# * web (hooks/*.ix_test.tsx) は vitest の test-ix レーンで実行する (DB 不要。現状は対象 0 件)
test/ix:
	@echo "Building docker images..."
	docker compose -p $(CODE_NAME)_ix_test -f compose.ix_test.yaml build --quiet
	@echo "Running api integration tests..."
	CODE_NAME=$(CODE_NAME) docker compose -p $(CODE_NAME)_ix_test -f compose.ix_test.yaml up --remove-orphans --abort-on-container-exit --exit-code-from nodejs
	@echo "Running web integration tests..."
	pnpm run --filter @apps/web test-ix

## Docker Compose を起動しつつ、変更を同期する
#
# * migration など、docker compose exec を実行するタスクでは先にこのタスクで
#   コンテナを起動している必要がある。
#
# * 各種サービスの確認方法
# *   mysql: :3306 ($ make mysql)
# *   api: http://localhost:4000
# *   web: http://localhost:4001
up:
	CODE_NAME=$(CODE_NAME) docker compose up --watch --build

## Docker Compose を終了する
#
# @RequireRunning `up`
#
down:
	docker compose down

## プロジェクトのクリーンアップ
#
# * node_modules, generated files, docker compose のコンテナ等を削除する
#
clean:
	pnpm run clean
	docker compose down --remove-orphans --rmi all --volumes

## コード生成
#
# * proto/**/*.proto もしくはデータベースのスキーマを変更した場合実行する
gen: gen/proto gen/db gen/doc

# proto/**/*.proto からコードを生成する
#
# 一旦 gen.tmp に書き出して rsync で同期することで、エディタがエラーになるのを避ける。
# エラーになるとしばらくそのキャッシュが残って不便なことが多いため。
gen/proto:
	pnpm run gen:proto
	rsync -av --delete ./apps/api/gen.tmp/ ./apps/api/gen
	rsync -av --delete ./apps/web/gen.tmp/ ./apps/web/gen
	rm -fr ./apps/api/gen.tmp ./apps/web/gen.tmp
	pnpm run --filter @apps/api fix
	pnpm run --filter @apps/web fix
	echo '*.ts linguist-generated=true' > apps/web/gen/.gitattributes
	echo '*.ts linguist-generated=true' > apps/api/gen/.gitattributes

# データベースからデータモデルを生成する
#
gen/db:
	pnpm run --filter @apps/api kysely-codegen --camel-case --out-file db/db-tmp.d.ts --url mysql://root:@localhost:3306/$(CODE_NAME)
	cat $(PWD)/apps/api/db/db-tmp.d.ts
	pnpm run --filter @devtools/kysely-columns start --file $(PWD)/apps/api/db/db-tmp.d.ts --type DB --out-file $(PWD)/apps/api/db/db-columns-tmp.ts
	pnpm run --filter @devtools/kysely-codemod start --file $(PWD)/apps/api/db/db-tmp.d.ts --type DB --out-file $(PWD)/apps/api/db/db-tmp.d.ts
	mv ./apps/api/db/db-tmp.d.ts ./apps/api/db/db.d.ts
	mv ./apps/api/db/db-columns-tmp.ts ./apps/api/db/columns.ts
	pnpm run --filter @apps/api fix
	pnpm run --filter @apps/web fix
	echo '*.ts linguist-generated=true' > apps/web/gen/.gitattributes
	echo '*.ts linguist-generated=true' > apps/api/gen/.gitattributes

gen/doc: gen/doc/proto gen/doc/db gen/doc/testing

## proto/**/*.proto から API ドキュメントを生成する
#
gen/doc/proto:
	docker run --user $(shell id -u $(USER)) --rm -v $(PWD)/docs/proto:/out -v $(PWD)/proto:/protos pseudomuto/protoc-gen-doc --doc_opt="json,proto.json" $(shell find ./proto -name '*.proto' | sort | sed -e 's,./proto/,,' | tr '\n' ' ')
	node devtools/build-proto-doc.mjs docs/proto/proto.json docs/proto
	pnpm exec prettier -w docs/proto/*.md

## データベースからドキュメントを生成する
#
# $ make watch でコンテナを起動している必要がある
gen/doc/db:
	docker compose exec --user $(shell id -u $(USER))  go tbls doc --rm-dist mysql://root:@mysql/$(CODE_NAME) docs/db
	pnpm exec prettier -w docs/db/*.md

## テスト項目ドキュメント(docs/testing/<app>)をまとめて生成する
#
# 出力先 docs/testing/<app> と 1:1 対応する target 階層
gen/doc/testing: gen/doc/testing/api gen/doc/testing/web

## apps/api のテストファイル (*.ix_test.ts) からテスト項目ドキュメントを生成する
#
# * describe / it を抽出し docs/testing/api/<対象パス>.md として出力する(source 構造を mirror)
# * テストコード側を SoT とし、本コマンドの出力は派生 doc として扱う
# * 削除されたテストに対応する orphan .md を残さないため、出力 dir を先に全消ししてから再生成する
gen/doc/testing/api:
	rm -rf docs/testing/api
	node devtools/build-test-doc.mjs apps/api docs/testing/api 'services/**/*.ix_test.ts'
	pnpm exec prettier -w 'docs/testing/api/**/*.md'

## apps/web のテストファイル (*.test.ts(x) / *.ix_test.ts(x)) からテスト項目ドキュメントを生成する
#
# * stdutils / utils / hooks / app(コロケ) 配下の describe / it を抽出し
#   docs/testing/web/<対象パス>.md として出力する(source 構造を mirror)
# * テストコード側を SoT とし、本コマンドの出力は派生 doc として扱う
# * 削除されたテストに対応する orphan .md を残さないため、出力 dir を先に全消ししてから再生成する
gen/doc/testing/web:
	rm -rf docs/testing/web
	node devtools/build-test-doc.mjs apps/web docs/testing/web 'stdutils/**/*.test.ts' 'utils/**/*.test.ts' 'hooks/**/*.ix_test.tsx' 'hooks/**/*.test.ts' 'components/**/*.test.tsx' 'app/**/*.test.ts' 'app/**/*.test.tsx'
	pnpm exec prettier -w 'docs/testing/web/**/*.md'

## ローカルの MySQL に接続
#
# $ make mysql/local
mysql:
	docker compose exec mysql mysql

## データベースの作成
#
db/create:
	docker compose exec mysql mysql -e "CREATE DATABASE $(CODE_NAME)"

## データベースの削除
#
db/drop:
	docker compose exec mysql mysql -e 'DROP DATABASE IF EXISTS $(CODE_NAME)'

## マイグレーションファイルのバリデーション
#
# @RequireRunning `up`
#
db/mig/validate:
	docker compose exec --user $(shell id -u $(USER)) go ./devtools/goose validate

## マイグレーションファイルの作成
#
# @RequireRunning `up`
# @Var            NAME（マイグレーションファイル名）
# @Example        $ make db/mig/create NAME=create_user_table
#
db/mig/create:
ifndef NAME
	$(error NAME is required)
endif
	docker compose exec --user $(shell id -u $(USER)) go ./devtools/goose create $(NAME)

## バージョンベースのマイグレーションファイルをタイムスタンプベースに変換する
#
# @RequireRunning `up`
# @When           マイグレーションを含む Pull Request をマージする直前
#
# * マイグレーションファイル名を変換するだけだと、ローカルの DB の状態と整合性が取れなくなってしまうため
# * ベースブランチにある最新 migration まで down し、ファイル名の変換 (goose fix) してから up する。
#
db/mig/fix:
ifeq ($(shell ls migrations/ | grep -v '^00' | wc -l), 0)
	$(error No need to fix.)
endif
ifneq ($(shell devtools/get-latest-migration-version), $(shell ls migrations/ | grep '^00' | cut -d_ -f1 | sort | tail -n1))
	$(error SQL files in migrations/ are not fresh. Please merge main branch.)
endif
	make db/mig/down TO=$(shell devtools/get-latest-migration-version)
	docker compose exec --user $(shell id -u $(USER)) go ./devtools/goose fix
	make db/mig/up

## `migrations/*.sql` を順に適用し、データベーススキーマのマイグレーションを行なう
#
# @RequireRunning `up`
# @RequireOnce    `db/create`
# @When           自分で `migrations/*.sql` を追加した時
# @When           git pull 等で取り込んだ変更で migration/*.sql が増えた時
#
db/mig/up:
	docker compose exec --user $(shell id -u $(USER)) go ./devtools/goose up

## マイグレーションのロールバック
#
# @RequireRunning `up`
# @Var            TO（どのバージョンまでロールバックしたいかを指定する）
# @Example        $ make db/mig/down TO=00001
#
db/mig/down:
ifndef TO
	$(error TO is required)
endif
	docker compose exec --user $(shell id -u $(USER)) go ./devtools/goose down-to $(TO)

## データベースをクリアしマイグレーションを適用
#
db/reset:
	make db/drop
	make db/create
	make db/mig/up

## User を削除する
#
# $ make ops/delete-user APP_ENV=dev USER_ID=xxx ADMIN_SECRET_TOKEN='****'
#
# APP_ENV は localhost / dev のいずれか
ops/delete-user:
ifndef APP_ENV
	$(error APP_ENV is required)
endif
ifndef USER_ID
	$(error USER_ID is required)
endif
ifndef ADMIN_SECRET_TOKEN
	$(error ADMIN_SECRET_TOKEN is required)
endif
	APP_ENV="$(APP_ENV)" USER_ID="$(USER_ID)" ADMIN_SECRET_TOKEN="$(ADMIN_SECRET_TOKEN)" pnpm run --filter @apps/api delete-user
