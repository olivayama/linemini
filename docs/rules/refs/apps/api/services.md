# サービス層(RPC ハンドラ / サービスクラス)

`apps/api/services/` の RPC ハンドラとサービスクラスを書く際の規約。

## 規範実装(暫定 / shake の mission を参照)

このレイヤーの規範実装は **entermotion-jp/shake**(GitHub MCP で参照)の mission サービスとする。新規・改修時は次を読み、ハンドラの薄さ・認証ゲート・ドメイン↔proto 変換(`#makeProtoXxx(s)`)の集約・命名・実装順などのパターンに倣う。

- `apps/api/services/mission_service_v1.ts`

注意:

- **既存ルール優先**: 本 doc の各規約と shake 実装が食い違う場合は本 doc を優先する。shake は本 doc が触れていないパターンの実例・補完として参照する。
- **legacy は除く**: `@deprecated` 関数・未使用引数など規範としない旧コードが混在し得る。パターンに倣い、これらは複製しない。
- **暫定措置**: 別リポジトリへの外部参照は本来望ましくないが、現状の事実上の規範であるため暫定として記載する。
- **参照できない場合はユーザーに確認**: アクセス権等で shake を参照できないときは、推測で進めずユーザーに確認する。

## ハンドラの認証

全 RPC ハンドラの先頭で認証ゲートを呼ぶ。次の3つから適切なものを選ぶ。

- `ensureAdminAuthenticated()` — admin 限定
- `ensureUserAuthenticated()` — user 限定
- `ensureAuthenticated()` — user か admin のいずれか

ID が必要な場合も、可読性のためまず先頭で `ensure*Authenticated()` を呼び、その後に `require*Id()` で ID を取得する形に統一する。

例外:

- 認証入口(サインイン / サインアップ等)は認証ゲート自体を持たない。
- 認証の有無にかかわらず操作全体を弾く環境ガード(本番環境での無効化 `OperationNotImplemented` など)は、認証ゲートより前に置いてよい(詳細は「環境別ゲート」)。

## 環境別ゲート(本番ブロック等)

環境に応じて RPC の挙動を変える / 無効化する場合は `ctx.appEnv` で分岐する。

- `appEnv` は `appConfig.appEnv`(`APP_ENV`)由来。RPC ハンドラでは `HandlerDomainContext.appEnv` で参照する(`now` のように個別引数で受け取らない)
- 本番でのみ無効化したい RPC は、本番判定で `DomainError('OperationNotImplemented')`(→ Connect `Unimplemented`)を throw する。認証ゲートより前に置く

  ```ts
  if (['prd'].includes(ctx.appEnv)) {
    throw new DomainError('OperationNotImplemented')
  }
  ```

- 環境名は値の直接比較でよい(`ctx.appEnv === 'localhost'` / `['prd'].includes(ctx.appEnv)` 等)。enum 化は不要
- テストは `makeTestServiceClient(service, impl, ctx, { appEnv: 'prd' })` で環境を差し替えて検証する(`services/testing/helpers.ts`)

## ハンドラは薄く保つ

ハンドラは認証とドメイン↔proto 変換のみに徹する。バリデーション・存在 / 重複チェック・業務不変条件チェックと、それに必要な集約の fetch は domain 関数へ委譲する([domain.md](./domain.md) 参照)。レスポンス構築用の関連エンティティの一括ロードは別で、サービス層の `#makeProtoXxxs` が担う。

## proto リクエストの null チェックは `ensureNotNull`

proto リクエストフィールドの存在チェックは `ensureNotNull` を使う。手動の `if (x == null) throw new DomainError('InvalidArgument')` を書かない。

## list 系 RPC は limit に上限を付ける

`req.paging.limit` をそのまま渡さず、`Math.min(req.paging?.limit ?? 20, 100)` で上限を付ける。

## レスポンスは proto 定義フィールドを充足する

proto が定義しているフィールドを空のまま返さない。契約と実装を一致させる。

## レスポンスは `new pb.XxxResponse({...})` で返す

RPC ハンドラの戻り値は `new pb.XxxResponse({...})` でラップする。プレーンオブジェクト(`return { ... }` / `return {}`)で返さない。connect-es 上は等価だが、全サービスがこの形で揃っているため一貫性のために合わせる。

## null になり得る単数レスポンスは三項で組む

対象が存在しないことがある単数取得ハンドラ(`GetOngoing` 系など)は、`null` 時に早期 return で空レスポンスを別途返さず、単一の return 内で三項にする。

```ts
return new pb.XxxResponse({
  field: x == null ? undefined : this.#makeProtoXxx(ctx, x),
})
```

## admin 専用フィールドは `maskAdminValue`

admin と user の両方が叩くエンドポイントで、非 admin に出してはいけない値は `ctx.maskAdminValue(adminValue, mask)` で制御する(非 admin には `mask` が返る)。

admin/非 admin でレスポンス内容が変わる場合も、ハンドラで `ctx.isAdmin` 分岐して別レスポンスを組み立てず、`#makeProtoXxx` ビルダー内の `maskAdminValue` に集約する(マスク方針をビルダー1箇所に集める)。

## 命名セマンティクス

- 作成 / 削除は通常 `Create` / `Delete`(作成専用は存在時に `AlreadyExists` で失敗する)
- `Create` / `Delete` が意味的に不自然な場合(関連・コレクションへの追加 / 除去など)は `Add` / `Remove` を対で使う
- 作成と更新を兼ねる(upsert・上書き)場合は `Set`

## サービスクラス構造

- `ServiceImpl<typeof XxxService>` を直接実装した**単一クラス**にする(内側クラス + 外側関数のような多層構造にしない)
- `server.ts` には `.service(XxxServiceV1Gen, new XxxServiceV1(...))` のチェーンで登録する
- ドメイン→proto 変換は `#makeProtoXxx` 系の private メソッドに集約する。リスト変換は**複数版 `#makeProtoXxxs` を本体**にし、**単数版 `#makeProtoXxx` は単一要素配列にして複数版へ委譲する**(逆向きにしない)。`noUncheckedIndexedAccess` 下では先頭要素が `undefined` 型を含むため、`invariant`(`tiny-invariant`)で除いてから返す。定義順は単数版→複数版。読み込み済みの集約をそのまま写すだけなら複数版は単純な `.map()` でよい
  - レスポンス構築に**関連エンティティのロードが必要**な場合は、複数版で ID をまとめて 1 回で引いて N+1 を回避する。単数版を本体にすると要素ごとにクエリが発行されるため、この委譲方向にする(下記は進捗を別取得して合成する例。fetch を伴うため `async`):

    ```ts
    // 単数版は単一要素配列にして複数版へ委譲する
    async #makeProtoMission(ctx: HandlerDomainContext, mission: Mission) {
      const [result] = await this.#makeProtoMissions(ctx, [mission])
      invariant(result != null)
      return result
    }

    // 複数版が本体。関連エンティティ(進捗)を ID 一括で取得し Map 化して合成する
    async #makeProtoMissions(ctx: HandlerDomainContext, missions: Mission[]) {
      const progresses = await this.progressRepository.listByMissionIds(
        ctx,
        missions.map((m) => m.id),
      )
      const progressById = new Map(progresses.map((p) => [p.missionId, p]))
      return missions.map(
        (mission) =>
          new missionPb.Mission({
            id: mission.id,
            cleared: progressById.get(mission.id)?.cleared ?? false,
          }),
      )
    }
    ```

## 時間枠から状態を算出するメソッド

開始 / 終了日時から状態(実施前 / 実施中 / 終了 等)を算出するメソッドは次に従う。

- 命名は `computeXxxState`(`get` プレフィックスにしない)
- 日時から状態を導く純関数なので `static` 公開メソッドにする(instance メソッド / private にしない)。呼び出しは `XxxServiceV1.computeXxxState(ctx, x)`
- 現在時刻は `now: Date` を個別に受けず、`ctx: DomainContext` を受けて `ctx.now` を参照する
- 期間は半開区間 `[start, end)` で判定する。開始境界は包含(`start <= now`)、終了境界は排他(`now < end`)。同じ期間で絞り込む SQL クエリも終了境界を排他(`.where('endDate', '>', ctx.now)`)にし、state 判定と SQL で境界をズラさない

## サービスの識別は生成定数で行う

interceptor 等でサービスを識別するとき、`req.service.typeName === 'services.xxx.v1.XxxService'` のようなマジック文字列で比較しない。生成定数 `XxxService.typeName`(gen の `xxx_service_connect.ts`)を import して参照する。
