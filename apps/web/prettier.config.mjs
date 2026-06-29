/** @type {import("prettier").Config} */
const config = {
  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  semi: false,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 120,
  tabWidth: 2,
  importOrder: ['^react$', '^next(/.+)?', '<THIRD_PARTY_MODULES>', '^@app/', '^@/', '^[./]'],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  tailwindConfig: './tailwind.config.ts',
}

export default config
