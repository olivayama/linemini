# ImageService

## UploadImage

画像をアップロードする

- **@throws** Unauthenticated admin_secret_token がない && 管理画面ログイン中ではない場合

### Request

| Name               | Type                             | Label    | Description |
| ------------------ | -------------------------------- | -------- | ----------- |
| admin_secret_token | string                           | optional |             |
| image              | [Image](#servicesimage.v1.image) |          |             |

### Response

| Name  | Type                             | Label | Description |
| ----- | -------------------------------- | ----- | ----------- |
| image | [Image](#servicesimage.v1.image) |       |             |

## TmpUploadImage

画像をアップロードする  
ブラウザ用のクライアントが client streaming をサポートするまでの間の暫定的なエンドポイント

- **@throws** Unauthenticated admin_secret_token がない && 管理画面ログイン中ではない場合

### Request

| Name               | Type                             | Label    | Description |
| ------------------ | -------------------------------- | -------- | ----------- |
| admin_secret_token | string                           | optional |             |
| image              | [Image](#servicesimage.v1.image) |          |             |

### Response

| Name  | Type                             | Label | Description |
| ----- | -------------------------------- | ----- | ----------- |
| image | [Image](#servicesimage.v1.image) |       |             |

## ListImages

画像の一覧を取得する

- **@throws** Unauthenticated 管理画面ログイン中ではない場合

### Request

| Name         | Type                                                | Label    | Description |
| ------------ | --------------------------------------------------- | -------- | ----------- |
| image_tag_id | string                                              | optional |             |
| paging       | [PagingOffsetRequest](#stdutilspagingoffsetrequest) |          |             |

### Response

| Name   | Type                                                  | Label    | Description |
| ------ | ----------------------------------------------------- | -------- | ----------- |
| images | [Image](#servicesimage.v1.image)                      | repeated |             |
| paging | [PagingOffsetResponse](#stdutilspagingoffsetresponse) |          |             |

## GetImageById

id で 画像の情報を取得する

- **@throws** Unauthenticated 認証に失敗した場合

### Request

| Name     | Type   | Label | Description |
| -------- | ------ | ----- | ----------- |
| image_id | string |       | 画像ID      |

### Response

| Name  | Type                             | Label | Description |
| ----- | -------------------------------- | ----- | ----------- |
| image | [Image](#servicesimage.v1.image) |       | 画像        |

## UpdateUploadImage

画像を更新する

- **@throws** Unauthenticated admin_secret_token がない && 管理画面ログイン中ではない場合

### Request

| Name          | Type                             | Label    | Description |
| ------------- | -------------------------------- | -------- | ----------- |
| image         | [Image](#servicesimage.v1.image) |          |             |
| replace_image | bool                             | optional |             |

### Response

| Name  | Type                             | Label | Description |
| ----- | -------------------------------- | ----- | ----------- |
| image | [Image](#servicesimage.v1.image) |       |             |

## UpdateTmpUploadImage

画像を更新する  
ブラウザ用のクライアントが client streaming をサポートするまでの間の暫定的なエンドポイント

- **@throws** Unauthenticated admin_secret_token がない && 管理画面ログイン中ではない場合

### Request

| Name          | Type                             | Label    | Description |
| ------------- | -------------------------------- | -------- | ----------- |
| image         | [Image](#servicesimage.v1.image) |          |             |
| replace_image | bool                             | optional |             |

### Response

| Name  | Type                             | Label | Description |
| ----- | -------------------------------- | ----- | ----------- |
| image | [Image](#servicesimage.v1.image) |       |             |

## CreateImageTag

画像タグを作成する

- **@throws** Unauthenticated 管理画面ログイン中ではない場合
  @throws AlreadyExists 既に同じ管理名の画像タグが存在する場合

### Request

| Name      | Type                                   | Label | Description |
| --------- | -------------------------------------- | ----- | ----------- |
| image_tag | [ImageTag](#servicesimage.v1.imagetag) |       | 画像タグ    |

### Response

| Name      | Type                                   | Label | Description |
| --------- | -------------------------------------- | ----- | ----------- |
| image_tag | [ImageTag](#servicesimage.v1.imagetag) |       | 画像タグ    |

## GetImageTagById

id で 画像タグの情報を取得する

- **@throws** Unauthenticated 認証に失敗した場合
  @throws NotFound 画像タグが見つからない場合

### Request

| Name         | Type   | Label | Description |
| ------------ | ------ | ----- | ----------- |
| image_tag_id | string |       | 画像タグID  |

### Response

| Name      | Type                                   | Label | Description |
| --------- | -------------------------------------- | ----- | ----------- |
| image_tag | [ImageTag](#servicesimage.v1.imagetag) |       | 画像タグ    |

## GetImageTagByAdminName

管理名から画像タグを取得する

- **@throws** Unauthenticated admin_secret_token がない && 管理画面ログイン中ではない場合

### Request

| Name               | Type   | Label    | Description |
| ------------------ | ------ | -------- | ----------- |
| admin_secret_token | string | optional |             |
| admin_name         | string |          |             |

### Response

| Name      | Type                                   | Label | Description |
| --------- | -------------------------------------- | ----- | ----------- |
| image_tag | [ImageTag](#servicesimage.v1.imagetag) |       |             |

## ListImageTags

画像タグの一覧を取得する

- **@throws** Unauthenticated 管理画面ログイン中ではない場合

### Request

| Name   | Type                                                | Label | Description |
| ------ | --------------------------------------------------- | ----- | ----------- |
| paging | [PagingOffsetRequest](#stdutilspagingoffsetrequest) |       |             |

### Response

| Name       | Type                                                  | Label    | Description |
| ---------- | ----------------------------------------------------- | -------- | ----------- |
| image_tags | [ImageTag](#servicesimage.v1.imagetag)                | repeated |             |
| paging     | [PagingOffsetResponse](#stdutilspagingoffsetresponse) |          |             |

## UpdateImageTag

画像タグ を更新する

- **@throws** Unauthenticated 認証に失敗した場合
  @throws NotFound 画像タグ が見つからない場合
  @throws FailedPrecondition 編集不可の場合
  @throws AlreadyExists 既に同じ管理名の画像タグが存在する場合

### Request

| Name      | Type                                   | Label | Description |
| --------- | -------------------------------------- | ----- | ----------- |
| image_tag | [ImageTag](#servicesimage.v1.imagetag) |       | 画像タグ    |

### Response

| Name      | Type                                   | Label | Description |
| --------- | -------------------------------------- | ----- | ----------- |
| image_tag | [ImageTag](#servicesimage.v1.imagetag) |       | 画像タグ    |

# Messages

## services.image.v1.Image

| Name       | Type                                   | Label    | Description |
| ---------- | -------------------------------------- | -------- | ----------- |
| id         | string                                 |          |             |
| admin_name | string                                 |          |             |
| image_url  | string                                 |          | OUTPUT_ONLY |
| created_at | Timestamp                              |          | OUTPUT_ONLY |
| updated_at | Timestamp                              | optional | OUTPUT_ONLY |
| tag_ids    | string                                 | repeated |             |
| image      | bytes                                  |          | INPUT_ONLY  |
| tags       | [ImageTag](#servicesimage.v1.imagetag) | repeated | OUTPUT_ONLY |

## services.image.v1.ImageTag

| Name       | Type      | Label    | Description |
| ---------- | --------- | -------- | ----------- |
| id         | string    |          |             |
| admin_name | string    |          |             |
| is_locked  | bool      |          |             |
| created_at | Timestamp |          | OUTPUT_ONLY |
| updated_at | Timestamp | optional | OUTPUT_ONLY |

## stdutils.PagingOffsetRequest

| Name   | Type  | Label    | Description |
| ------ | ----- | -------- | ----------- |
| offset | int32 | optional |             |
| limit  | int32 |          |             |

## stdutils.PagingOffsetResponse

| Name        | Type  | Label | Description |
| ----------- | ----- | ----- | ----------- |
| total_count | int64 |       |             |
