import { NextMiddleware, NextRequest, NextResponse } from 'next/server'

import { appConfigServer } from '@/app/config.server'

const ADMIN_COOKIE_NAME = '__admin_key'
const ADMIN_QUERY_KEY = '__admin-key'

export function middleware(req: NextRequest): ReturnType<NextMiddleware> {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin')) {
    return adminMiddleware(req)
  }
  return NextResponse.next()
}

function adminMiddleware(req: NextRequest): NextResponse {
  const { searchParams } = req.nextUrl

  // アクティベーション: クエリにキーがあれば cookie に書いてリダイレクト
  const provided = searchParams.get(ADMIN_QUERY_KEY)
  if (provided != null && provided === appConfigServer.adminUrlKey) {
    const url = req.nextUrl.clone()
    url.searchParams.delete(ADMIN_QUERY_KEY)
    const res = NextResponse.redirect(url)
    // Cookie 値はキーそのもの（ローテーション時の自動 invalidate を狙う）。
    // HttpOnly + Secure で通常の経路からは抜けないが、obscurity 用途であり
    // 本質認証ではないため、漏洩時の被害は admin URL の発覚に限られる
    res.cookies.set(ADMIN_COOKIE_NAME, appConfigServer.adminUrlKey, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/admin',
      maxAge: 60 * 60 * 24 * 365, // 1年
    })
    return res
  }

  // Cookie の key と一致している場合に通す。key が未設定の場合は保護なしとみなして通す
  if (
    appConfigServer.adminUrlKey == null ||
    req.cookies.get(ADMIN_COOKIE_NAME)?.value === appConfigServer.adminUrlKey
  ) {
    return NextResponse.next()
  }
  return NextResponse.rewrite(new URL('/not-found', req.url))
}

export const config = { matcher: ['/admin/:path*'] }
