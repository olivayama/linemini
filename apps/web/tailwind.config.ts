import { getIconCollections, iconsPlugin } from '@egoist/tailwindcss-icons'

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './app/**/*.{ts,tsx,mdx}',
    './src/**/*.{ts,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    container: {
      center: true,
      padding: '1rem',
      screens: {
        // '2xl': '1400px',
        '2xl': '800px',
      },
    },
    extend: {
      gridTemplateRows: {
        'layout-shell': 'auto 1fr auto',
        'admin-layout-shell': 'auto 1fr',
        'sheet-content': 'auto 1fr auto',
      },
      gridTemplateColumns: {
        'app-bar': '1fr auto 1fr',
        'admin-layout-shell': 'auto 1fr',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        link: {
          foreground: 'hsl(var(--link-foreground))',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ref. https://developers.line.biz/ja/docs/line-login/login-button/#color
        line: {
          // テキスト/ロゴ: #FFFFFF
          foreground: '#FFFFFF',
          // 縦線: #000000 8%
          vertical: 'hsla(0, 0%, 0%, 8%)',
          // 基本色: #06C755
          background: '#06C755',
          // マウスホバー: #000000 (10%)
          hover: 'hsla(0, 0%, 0%, 10%)',
          // タップ/クリック: #000000 (30%)
          active: 'hsla(0, 0%, 0%, 30%)',
        },
        'line-disabled': {
          // テキスト/ロゴ: #1E1E1E (20%)
          foreground: 'hsla(0, 0%, 12%, 20%)',
          // 枠線: #E5E5E5 (60%)
          border: 'hsla(0, 0%, 90%, 60%)',
          // 縦線: #E5E5E5 (60%)
          vertical: 'hsla(0, 0%, 90%, 60%)',
          // 無効: #FFFFFF
          background: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'scale-in': {
          from: { transform: 'scale(0)' },
          to: { transform: 'scale(1)' },
        },
        'toast-swipe-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'spin-fast': 'spin 0.5s linear infinite',
        'toast-swipe-out': 'toast-swipe-out 200ms ease-out forwards',
      },
      fontFamily: {
        main: ['var(--noto-sans-jp-font)', 'Apple Color Emoji', 'Noto Color Emoji'],
        mincho: ['Shippori Mincho', 'Apple Color Emoji', 'Noto Color Emoji'],
      },
      padding: {
        'ios-safe-area-bottom': 'env(safe-area-inset-bottom)', // iOSのsafe area対応
        'bottom-navigation': 'calc(56px + env(safe-area-inset-bottom))',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    iconsPlugin({
      collections: {
        ...getIconCollections(['material-symbols', 'lucide']),
        // 自作アイコン追加時の注意点
        // svgアイコンのパスに stroke="black" のように stroke や fill 属性が指定されているとCSSクラスで色変更ができない。CSSクラスで色変更できるようにするため stroke や fill 属性に "currentColor" を指定すること。
        // 同じようにサイズについても svg 内で記載しているとCSSクラスから変更できないため、 svg内の width, height 指定は削除すること。
        /*
        custom: {
          icons: {
            xxxxxx: {
              body: fs.readFileSync(path.resolve(__dirname, './components/icons/custom-icons/xxxxxx.svg'), 'utf8'),
              width: 24,
              height: 24,
            },
          },
        },
        */
      },
    }),
  ],
  safelist: [
    // 動的に指定する可能性があるため使用する可能性のあるクラスを事前に定義
  ],
}
