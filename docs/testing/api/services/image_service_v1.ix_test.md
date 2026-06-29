# ImageServiceV1

## tmpUploadImage

- 管理者セッションなしは認証エラー（Unauthenticated）
- 画像をアップロードすると作成結果を返す
- アップロードはオブジェクトストレージへ公開設定で書き込まれる

## updateTmpUploadImage

- 画像差し替えありで送ると新しい画像 URL に更新される
- 画像差し替えなしでは画像 URL を維持して更新する

## uploadImage

- ストリーミングでアップロードすると作成結果を返す
- ストリーミングアップロードはオブジェクトストレージへ公開設定で書き込まれる

## updateUploadImage

- 画像差し替えありでストリーミング送信すると画像 URL が更新され、ストレージへ書き込まれる
- 画像差し替えなしのストリーミングはストレージへ書き込まず画像 URL を維持する

## listImages

- 画像タグ ID 指定でそのタグを持つ画像のみ返す

## createImageTag

- 指定した管理名のタグを作成して返す
- 管理名が既存タグと重複するときは重複エラー（AlreadyExists）

## updateImageTag

- ロックされていないタグの管理名・ロック状態を更新する
- ロック中のタグの更新は拒否される（FailedPrecondition）
- 管理名を別タグと重複する名前へ変更するときは重複エラー（AlreadyExists）
