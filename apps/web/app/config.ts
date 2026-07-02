import { throwError } from '@/stdutils/error'

export type AppEnv = 'localhost' | 'snd' | 'dev' | 'stg' | 'prd'

export const appConfig = {
  appEnv: (process.env.NEXT_PUBLIC_APP_ENV as AppEnv) ?? throwError('NEXT_PUBLIC_APP_ENV is required'),
  brand: {
    name: 'xxxbrandnamexxx',
    officialSitesUrl: 'https://official.example.com',
  },
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? throwError('NEXT_PUBLIC_BASE_URL is required'),
  connect: {
    baseUrl:
      process.env.CONNECT_BASE_URL ??
      process.env.NEXT_PUBLIC_CONNECT_BASE_URL ??
      throwError('NEXT_PUBLIC_CONNECT_BASE_URL is required'),
  },
  liffId: process.env.NEXT_PUBLIC_LIFF_ID ?? throwError('NEXT_PUBLIC_LIFF_ID is required'),
  liffUrl: process.env.NEXT_PUBLIC_LIFF_URL ?? throwError('NEXT_PUBLIC_LIFF_URL is required'),
  liffEndpointPathname: '/mini',
  serviceName: 'xxxappnamexxx',
  description: '',
  serviceAgreementVersion: '1',
  tutorialVersion: '1',
  get gtm() {
    // GTM ID は env ごとに設定できるようにしている。通常は共通の 1 つで足りるが
    //(dev/prd の振り分けは GA 側のデータストリームで行うため)、稀に prd だけお客様環境に
    // するなど env ごとに別の値を使いたいケースがあるため env 別に持てる構造にしている。
    const ids: Record<AppEnv, string> = {
      localhost: '',
      snd: '',
      dev: '',
      stg: '',
      prd: '',
    }
    return {
      id: ids[appConfig.appEnv] ?? throwError(`Invalid appEnv: ${appConfig.appEnv}`),
      // gtm_user_id / gtm_line_uid はユーザー識別子クッキー。寿命はセッション Cookie に合わせる
      // (cookie.user.maxAge を参照しているので、セッションの maxAge 変更に自動で連動する)。
      // name を変更する場合は GTM 側の設定も合わせること。
      userIdCookie: { name: 'gtm_user_id', maxAge: appConfig.cookie.user.maxAge },
      lineUidCookie: { name: 'gtm_line_uid', maxAge: appConfig.cookie.user.maxAge },
    }
  },
  get cookie() {
    return {
      user: {
        name: process.env.COOKIE_NAME ?? 'testyama:sess',
        maxAge: parseInt(process.env.COOKIE_MAX_AGE ?? '31536000', 10), // 60 * 60 * 24 * 365
        password: process.env.COOKIE_PASSWORD ?? 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      admin: {
        name: process.env.COOKIE_ADMIN_NAME ?? 'testyama:sess-admin',
        maxAge: parseInt(process.env.COOKIE_ADMIN_MAX_AGE ?? '31536000', 10), // 60 * 60 * 24 * 365
        password: process.env.COOKIE_ADMIN_PASSWORD ?? 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    }
  },
}
