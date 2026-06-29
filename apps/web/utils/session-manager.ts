import { cookies } from 'next/headers'

import { sealData, unsealData } from 'iron-session'

type SessionConfig = {
  name: string
  maxAge: number
  password: string
}

type Session = {
  userId: string
  accessToken: string
  lineUid?: string
}

export class SessionManager {
  private config: SessionConfig

  constructor(config: SessionConfig) {
    this.config = config
  }

  getSession() {
    const cookieStore = cookies()

    const sealedSession = cookieStore.get(this.config.name)
    if (sealedSession == null) {
      return undefined
    }
    return unsealData<Session>(sealedSession.value, {
      password: this.config.password,
      ttl: this.config.maxAge,
    })
  }

  async setSession(res: { userId: string; accessToken: string }, additional?: { lineUid?: string }) {
    const cookieStore = cookies()

    const session = await sealData(
      { userId: res.userId, accessToken: res.accessToken, lineUid: additional?.lineUid } satisfies Session,
      {
        password: this.config.password,
        ttl: this.config.maxAge,
      },
    )

    return cookieStore.set(this.config.name, session, {
      secure: true,
      // httpOnly を true にすると、liff の isLoggedIn が必ず false になる
      // httpOnly: true,
      httpOnly: false,
      sameSite: 'lax',
      maxAge: this.config.maxAge,
    })
  }

  deleteSession() {
    const cookieStore = cookies()
    cookieStore.delete(this.config.name)
    return cookieStore
  }
}
