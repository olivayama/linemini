# ドメイン層

`apps/api/domain/` を書く際の規約。

## 規範実装(暫定 / shake の mission を参照)

このレイヤーの規範実装は **entermotion-jp/shake**(GitHub MCP で参照)の mission ドメインとする。新規・改修時は次を読み、集約型の定義・`Create<T>`/`Update<T>` を返すドメイン関数・`produce`(immer) での差分更新・`DomainError` の使い分け・`__domainEvents` の付与などのパターンに倣う。

- `apps/api/domain/mission.ts`

注意:

- **既存ルール優先**: 本 doc の各規約と shake 実装が食い違う場合は本 doc を優先する。shake は本 doc が触れていないパターンの実例・補完として参照する。
- **legacy は除く**: `@deprecated` 関数・未使用引数など規範としない旧コードが混在し得る。パターンに倣い、これらは複製しない。
- **暫定措置**: 別リポジトリへの外部参照は本来望ましくないが、現状の事実上の規範であるため暫定として記載する。
- **参照できない場合はユーザーに確認**: アクセス権等で shake を参照できないときは、推測で進めずユーザーに確認する。

## バリデーションは domain 層で行う

存在 / 重複チェック・業務不変条件チェックと、それに必要な集約の fetch は、repository を引数に取る domain 関数で行う(レスポンス構築用の関連エンティティの一括ロードは別で、サービス層の `#makeProtoXxxs` が担う)。

- ハンドラ側は認証とドメイン↔proto 変換のみを担い、ロジックは domain 関数へ委譲する([services.md](./services.md)「ハンドラは薄く保つ」参照)

## 常に現在ユーザーが対象なら ctx から取る

操作対象が常にリクエスト元の session user である domain 関数は、`currentUserId` を引数で受けず `ctx` から取る。

- ユーザー限定の関数: `ctx.requireUserId()` を直接呼ぶ。
- admin / user 両方から呼ばれる関数: `if (ctx.isUser) { ctx.requireUserId() }` でガードする。

admin 代理(`requireOverridableUserId`)等で対象が session user と乖離し得る場合のみ引数化する。

## ドメインエラーの評価順序

引数だけで判定できる検証(`InvalidArgument`)は、集約の fetch・存在チェック(`EntityNotFound`)より前に置く。不正な引数のときに DB アクセスせず即返せて fail-fast になり、エラーの優先順位も自然になる。create / update など同種の関数間で検証の配置を揃える。

## ドメインエラーの区別

エラーは状態で区別できる(不在=`EntityNotFound` / 重複=`EntityAlreadyExists` / 存在するが操作に適さない=`FailedPrecondition`)。基本は区別する。現状は区別する意味がなくても、分けてコードが複雑にならないなら将来の保守性のため分けておく。まとめる方が簡素になり、かつ区別する必要もない場合だけ、分けない。

区別が役立つ例: 対になる操作(add/remove 等)との対称性を保ちたい、フロントでエラー種別ごとに出し分ける、など。
