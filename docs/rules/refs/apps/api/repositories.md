# リポジトリ層

repository とそのインターフェースを書く際の規約。

## 規範実装(同梱リポジトリを一次参照 / shake は補完)

このレイヤーの規範実装は、本テンプレ同梱の `apps/api/repositories/{administrator,image,user}/`(`administrator-repository.ts` / `image-repository.ts` / `image-tag-repository.ts` / `user-repository.ts`)とする。標準的な CRUD(get/list の input バリアント、単一テーブルのフィルタ構築、1:1・一対多・多対多の永続化、明示 marshal/unmarshal、JSON / DateOnly 変換、`acquireLockQuery`、子 → 親順 delete、一括ロード)はこれらを直接参照すればよい(shake は不要)。interface 契約は `apps/api/domain/repositories.ts`。

同梱リポジトリに無い構成は、**entermotion-jp/shake**(GitHub MCP で参照)のミッション系リポジトリ(`apps/api/repositories/mission/`)を補完として参照する。次のパターンは同梱に例が無いため shake を見る:

- **join を伴う `listQuery`**(他テーブルを `leftJoin` し結合先カラムで絞り込む)と、それに伴う `super(pool, emitter, '<tableName>')` コンストラクタ(paging の id 列修飾)・`sql` テンプレートの生 select で得た派生列を `ListOrderByKey` に使う型(`mission-participation-repository.ts`)
- `ctx.now` を使う時刻ベース絞り込み・proto enum / state による絞り込み(`eb.or([col is null, col > now])` の開区間表現)(`mission-group-repository.ts`)
- 複合(自然)キーの GetInput バリアント(`eb.and([...])`)・boolean → null 有無比較・呼び出し側が比較演算子を渡す可変フィルタ(`mission-participation-repository.ts` / `mission-step-repository.ts`)
- 派生列・join 由来の行を含む複雑な `#marshal`/`#unmarshal` の組み立て例(`mission-step-repository.ts`)

注意:

- **既存ルール優先**: 本 doc の各規約と参照実装(同梱 / shake)が食い違う場合は本 doc を優先する。
- **legacy / 不備は複製しない**: 同梱・shake とも `@deprecated`・未使用引数・実装漏れ(例: shake の子テーブル削除漏れ entermotion-jp/shake#577)が混在し得る。パターンに倣い、これらは複製しない。
- **shake を参照できない場合**: アクセス権等で参照できないときは、同梱リポジトリで自己完結する範囲はそのまま進め、shake 固有パターンが必要な場合のみユーザーに確認する。

## Repository は永続化に徹する

「ID 以外の条件で 1 件引く」処理は、独自メソッドや interface の `& { ... }` 拡張で追加せず、GetInput のバリアントで表現する。

## 読み取り最適化クエリは QueryService へ(ただし最後の手段)

まず既存のリポジトリの仕組み(`get` / `list` + input バリアント)で対応できないかを検討する。QueryService が乱立すると可読性が下がるため、リポジトリでは表現できない・集約の形に縛られない読み取り最適化クエリに限り、QueryService に置く。

実装方針:

- `services/<name>_query_service.ts` に、集約の persist / restore を持たないプレーンなクラスとして置く。コンストラクタは `Pool<DB>` のみを受け取る
- 各メソッドは第 1 引数に `DomainContext` を取り、`dbPool.reader` に読み取り専用クエリを直接発行する。集約の unmarshal を経由せず、必要なカラムだけを select して branded ID 等へ詰め替えて返す
- `server.ts` で `new XxxQueryService(dbPool)` として生成し、利用側サービスのコンストラクタへ注入する

最小例:

```ts
// services/member_query_service.ts
import { DomainContext } from '@/domain/context'
import { UserId } from '@/domain/ids'
import { Pool } from '@/stdutils/db-pool'

export class MemberQueryService {
  constructor(private readonly dbPool: Pool<DB>) {}

  async getUsersByLineUids(
    ctx: DomainContext,
    lineUids: string[],
  ): Promise<Array<{ userId: UserId; lineUid: string }>> {
    if (lineUids.length === 0) return []

    const rows = await this.dbPool.reader
      .selectFrom('user')
      .innerJoin('userLineAccount', 'user.id', 'userLineAccount.userId')
      .select(['user.id', 'userLineAccount.uid'])
      .where('userLineAccount.uid', 'in', lineUids)
      .execute()

    return rows.map((row) => ({ userId: UserId(row.id), lineUid: row.uid }))
  }
}
```

## 新規リポジトリは基底クラスの作法に従う

基底クラス `MySQLRepository`(`apps/api/stdutils/mysql-repository.ts`)の抽象メソッドを実装する形で書く(同梱の administrator / image / user リポジトリがこの形の規範)。

- **`persist*` はオーバーライドしない**。基底の `persistCreate` / `persistUpdate` / `persistDelete` が domain events の emit や `domainEventTransaction` への参加を担うため、上書きするとそれらが効かなくなる。
- **`acquireLockQuery` は `.forUpdate().noWait()` を付ける**。基底の `acquireLock` は `ER_LOCK_NOWAIT` を `FailedToAcquireLock` に変換する fail-fast 設計のため、`.noWait()` がないとロック競合時に `innodb_lock_wait_timeout`(既定 50s)まで待ってしまう。
- **`update` の差分更新は `update` 内に直接書く**。1 箇所からしか呼ばれない `#persistPatch` のような private メソッドへ切り出さない。差分は `getChangedColumns(...)` で求め、変更があったカラムだけ `set` する。
- **メソッドの定義順は query 系 → mutator 系に揃える**: `getQuery` → `listQuery` → `acquireLockQuery` → `getAllByIdsQuery` → `loadAllChildren` → `insert` → `update` → `delete` → `#unmarshal` → `#marshal`。
- **単一テーブルの select はカラム修飾しない**。`.selectAll()` / `.where('id', '=', ...)` と書き、`selectAll('table')` / `where('table.col', ...)` の修飾は join で曖昧さがある場合のみ使う。
- **`#marshal` / `#unmarshal` はフィールドを明示的に列挙して変換する**。戻り値型を `#marshal(entity): { xxx: MarshalOutput<XxxTable>; ... }` と注釈し、必須カラムの付け忘れを型で検出させる。`toNullDeep` / `toUndefinedDeep` のような行全体の一括変換ヘルパは使わない(子オブジェクトへの FK 混入・JSON カラム破壊・カラム追加時の意図しない素通しを招くため)。null↔undefined / boolean / JSON(`JsonValueImpl`)/ DateOnly(`dateOnlyToDate` / `dateToDateOnly`)/ branded ID の各変換は規範リポジトリの `#marshal` / `#unmarshal` に倣う。**unmarshal が組み立てるドメインオブジェクトには宣言フィールドのみを入れ、`userId` 等の FK 行カラムを素通しさせない**(`JSON.stringify` する consumer で露出するため)。引数名は `rowset`(小文字)に揃える。

## `listQuery` のフィルタ構築は重複させず `eb.and(filters)` で返す

`listQuery` で複数の任意フィルタを組むときは、`filters` 配列に push して最後に `return eb.and(filters)` で返す(空配列は `true` に正規化されるため、三項で `eb.lit(true)` に分岐しない)。真偽で出し分ける相関サブクエリ(EXISTS 等)は分岐ごとに同じ式を二重に組まず、1 度だけ構築して反転時は `eb.not(...)` で包む。

既存パターン: `image-repository.ts` / `image-tag-repository.ts` の `listQuery`。
