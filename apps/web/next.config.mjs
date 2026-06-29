import createMDX from '@next/mdx'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */

const nextConfig = {
  /*
  async redirects() {
    return [
      {
        source: '/xx/:xxxxxxx',
        destination: `${process.env.NEXT_PUBLIC_LIFF_URL}/xxxxxxxxxx/:xxxxxxx/xxxxxx`,
        permanent: false,
      },
    ]
  },
  */
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  // 管理画面アクティベーションキーの Referer 漏洩対策 (docs/rules/refs/apps/web/admin-protection.md)
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'same-origin' }],
      },
    ]
  },
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm, remarkBreaks],
  },
})

// MDX設定を統合してエクスポート
export default withMDX(nextConfig)
