/** 認証状態(storageState)の保存先/読込先。auth.setup と playwright.config で共有し drift を防ぐ。 */
export const STORAGE_STATE = 'e2e/.auth/user.json'
