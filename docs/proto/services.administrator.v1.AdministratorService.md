# AdministratorService

## CreateAdministrator

管理者を作成する

- **@throws** Unauthenticated 管理者として認証されていない場合

### Request

| Name  | Type   | Label | Description |
| ----- | ------ | ----- | ----------- |
| email | string |       |             |

### Response

| Name          | Type                                                     | Label | Description |
| ------------- | -------------------------------------------------------- | ----- | ----------- |
| administrator | [Administrator](#servicesadministrator.v1.administrator) |       |             |

## SendAdministratorInvitation

管理者に招待メールを送る

- **@throws** Unauthenticated 管理者として認証されていない場合

### Request

| Name             | Type   | Label | Description |
| ---------------- | ------ | ----- | ----------- |
| administrator_id | string |       |             |

### Response

| Name | Type | Label | Description |
| ---- | ---- | ----- | ----------- |

## DeactivateAdministrator

管理者を停止する

- **@throws** Unauthenticated 管理者として認証されていない場合

### Request

| Name             | Type   | Label | Description |
| ---------------- | ------ | ----- | ----------- |
| administrator_id | string |       |             |

### Response

| Name          | Type                                                     | Label | Description |
| ------------- | -------------------------------------------------------- | ----- | ----------- |
| administrator | [Administrator](#servicesadministrator.v1.administrator) |       |             |

## SignInAsAdministrator

ログインする

- **@throws** Unauthenticated 管理者として認証されていない場合

### Request

| Name             | Type   | Label    | Description |
| ---------------- | ------ | -------- | ----------- |
| email            | string |          |             |
| password         | string |          |             |
| invitation_token | string | optional |             |

### Response

| Name             | Type   | Label | Description |
| ---------------- | ------ | ----- | ----------- |
| administrator_id | string |       |             |
| access_token     | string |       |             |

## GetMyAdministratorSession

自身の管理者セッション取得する

- **@throws** Unauthenticated 管理者として認証されていない場合

### Request

| Name         | Type   | Label | Description |
| ------------ | ------ | ----- | ----------- |
| access_token | string |       |             |

### Response

| Name             | Type   | Label | Description |
| ---------------- | ------ | ----- | ----------- |
| administrator_id | string |       |             |
| access_token     | string |       |             |

## UpdateMyAdministratorPassword

自身のパスワードを更新する

- **@throws** Unauthenticated 管理者として認証されていない場合
  @throws InvalidArgument 新しいパスワードが不正な場合

### Request

| Name             | Type   | Label | Description |
| ---------------- | ------ | ----- | ----------- |
| current_password | string |       |             |
| new_password     | string |       |             |

### Response

| Name          | Type                                                     | Label | Description |
| ------------- | -------------------------------------------------------- | ----- | ----------- |
| administrator | [Administrator](#servicesadministrator.v1.administrator) |       |             |

# Messages

## services.administrator.v1.Administrator

| Name  | Type   | Label | Description |
| ----- | ------ | ----- | ----------- |
| id    | string |       |             |
| email | string |       |             |
