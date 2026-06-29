# サービス呼び出しの import

apps/web から API サービスの RPC(connectquery)を呼ぶ際の import 元の規約。

## 生成 connectquery は barrel 経由で import する

`apps/web/services/<name>_service.ts`(`export * from '...-connectquery'`)の barrel があるサービスは、RPC を生成ファイルから直 import せず、必ず `@/services/<name>_service` barrel 経由で import する。

既存パターン: `page-router.tsx` / `connectrpc-provider.tsx`(`@/services/maintenance_service` 経由)。
