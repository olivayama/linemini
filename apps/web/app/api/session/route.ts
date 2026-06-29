import { cookies } from 'next/headers'

import { Code, ConnectError, createPromiseClient } from '@connectrpc/connect'

import { appConfig } from '@/app/config'
import { AdministratorService } from '@/gen/services/administrator/v1/administrator_service_connect'
import { UserService } from '@/gen/services/user/v1/user_service_connect'
import { SignInOrUpByLineOpenIdRequest_SignUpParams } from '@/gen/services/user/v1/user_service_pb'
import { createConnectTransportUserWeb } from '@/stdutils/connect'
import { SessionManager } from '@/utils/session-manager'

const getSessionManager = (req: Request) => {
  const url = new URL(req.url)
  const type = url.searchParams.get('sessionType')
  if (type == null || !(type in appConfig.cookie)) {
    throw new Response(undefined, { status: 400 })
  }
  const cookie = appConfig.cookie[type as keyof typeof appConfig.cookie]
  return [type, new SessionManager(cookie)] as const
}

const getServices = () => {
  const transport = createConnectTransportUserWeb({})
  const userService = createPromiseClient(UserService, transport)
  const administratorService = createPromiseClient(AdministratorService, transport)
  return { userService, administratorService }
}

const noCache = (init?: ResponseInit) => {
  const headers = new Headers(init?.headers)
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  headers.set('Pragma', 'no-cache')
  return { ...init, headers }
}

const noCacheResponse = (body: BodyInit | null, init?: ResponseInit) => {
  return new Response(body, noCache(init))
}

const noCacheResponseJson = (body: unknown, init?: ResponseInit) => {
  return Response.json(body, noCache(init))
}

export async function GET(req: Request) {
  // TODO: access token の有効期限のチェックを行なう
  try {
    const [sessionType, sessionManager] = getSessionManager(req)
    const { userService, administratorService } = getServices()
    const session = await sessionManager.getSession()
    if (session == null) {
      return noCacheResponse('unauthenticated', { status: 401 })
    }

    switch (sessionType) {
      case 'user': {
        const userMe = await userService.getMyUserSession({ accessToken: session.accessToken })
        if (userMe == null) {
          return noCacheResponse(null, { status: 400 })
        }
        const { gtm } = appConfig
        return noCacheResponseJson(
          { userId: userMe.userId, accessToken: userMe.accessToken, lineUid: session.lineUid ?? '' },
          {
            headers: [
              [
                'Set-Cookie',
                (
                  await sessionManager.setSession(
                    {
                      accessToken: userMe.accessToken,
                      userId: userMe.userId,
                    },
                    { lineUid: session.lineUid },
                  )
                ).toString(),
              ],
              [
                'Set-Cookie',
                cookies()
                  .set(gtm.userIdCookie.name, userMe.userId, {
                    secure: true,
                    httpOnly: false,
                    sameSite: 'lax',
                    maxAge: gtm.userIdCookie.maxAge,
                  })
                  .toString(),
              ],
              [
                'Set-Cookie',
                cookies()
                  .set(gtm.lineUidCookie.name, session.lineUid ?? '', {
                    secure: true,
                    httpOnly: false,
                    sameSite: 'lax',
                    maxAge: gtm.lineUidCookie.maxAge,
                  })
                  .toString(),
              ],
            ],
          },
        )
      }
      case 'admin': {
        const administratorMe = await administratorService.getMyAdministratorSession({
          accessToken: session.accessToken,
        })
        if (administratorMe == null) {
          return noCacheResponse(null, { status: 400 })
        }
        return noCacheResponseJson(administratorMe, {
          headers: {
            'Set-Cookie': (
              await sessionManager.setSession({
                accessToken: administratorMe.accessToken,
                userId: administratorMe.administratorId,
              })
            ).toString(),
          },
        })
      }
    }
  } catch (e) {
    if (e instanceof ConnectError && e.code === Code.Unauthenticated) {
      return noCacheResponse(null, { status: 400 })
    }
    throw e
  }
}

export async function POST(req: Request) {
  const [sessionType, sessionManager] = getSessionManager(req)
  const { userService, administratorService } = getServices()

  const { type, ...body } = await req.json()
  try {
    switch (sessionType) {
      case 'user': {
        const userMe = await (() => {
          switch (type) {
            case 'line': {
              if (body.token == null) {
                return null
              }
              return userService.signInOrUpByLineOpenId({
                lineOpenIdToken: body.token,
                signUpParams:
                  body.signUpParams == null
                    ? undefined
                    : new SignInOrUpByLineOpenIdRequest_SignUpParams(body.signUpParams),
              })
            }
            // case 'guest': {
            //   return userService.signUpAsGuest({})
            // }
          }
        })()
        if (userMe == null) {
          return noCacheResponse(null, { status: 400 })
        }
        const { gtm } = appConfig
        return noCacheResponseJson(
          { userId: userMe.userId, accessToken: userMe.accessToken, lineUid: userMe.userLineAccountUid ?? '' },
          {
            headers: [
              [
                'Set-Cookie',
                (
                  await sessionManager.setSession(
                    {
                      accessToken: userMe.accessToken,
                      userId: userMe.userId,
                    },
                    { lineUid: userMe.userLineAccountUid },
                  )
                ).toString(),
              ],
              [
                'Set-Cookie',
                cookies()
                  .set(gtm.userIdCookie.name, userMe.userId, {
                    secure: true,
                    httpOnly: false,
                    sameSite: 'lax',
                    maxAge: gtm.userIdCookie.maxAge,
                  })
                  .toString(),
              ],
              [
                'Set-Cookie',
                cookies()
                  .set(gtm.lineUidCookie.name, userMe.userLineAccountUid ?? '', {
                    secure: true,
                    httpOnly: false,
                    sameSite: 'lax',
                    maxAge: gtm.lineUidCookie.maxAge,
                  })
                  .toString(),
              ],
            ],
          },
        )
      }
      case 'admin': {
        const administratorMe = await administratorService.signInAsAdministrator({
          email: body.email,
          password: body.password,
        })
        if (administratorMe == null) {
          return noCacheResponse(null, { status: 400 })
        }
        return noCacheResponseJson(administratorMe, {
          headers: {
            'Set-Cookie': (
              await sessionManager.setSession({
                accessToken: administratorMe.accessToken,
                userId: administratorMe.administratorId,
              })
            ).toString(),
          },
        })
      }
    }
  } catch (e) {
    if (e instanceof ConnectError && e.code === Code.Unauthenticated) {
      return new Response(undefined, { status: 400 })
    }
    if (e instanceof ConnectError && e.code === Code.FailedPrecondition) {
      // サービス同意バージョンの指定なしでユーザーを作成しようとした場合
      // 403エラーをフロントに伝えて同意画面へリダイレクトさせる
      return new Response(undefined, { status: 403 })
    }
    if (e instanceof ConnectError) {
      console.log(e.rawMessage)
      console.log(e.cause)
    }
    throw e
  }
}

export async function DELETE(req: Request) {
  const [, sessionManager] = getSessionManager(req)
  return noCacheResponse(null, {
    status: 204,
    headers: {
      'Set-Cookie': sessionManager.deleteSession().toString(),
    },
  })
}
