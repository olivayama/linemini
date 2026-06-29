/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config'

import baseConfig from './vite.config'

// 結合テスト(*.ix_test.ts(x): renderHook + MSW など)専用レーン。
//
// unit(`test` スクリプト)とは config を分離し、unit が結合テストを拾わないようにする
// (vitest の既定 include は `*.test` のみで `*.ix_test` を拾わないが、ここで明示的に
//  別レーンへ振り分けることで「unit に結合テストが混入する」事故を構造的に防ぐ)。
//
// 実行: `pnpm test-ix`(= 本 config) / `make test/ix`(API docker 結合 + 本レーン)。
// DOM が要るテストはファイル先頭で `// @vitest-environment jsdom` を指定する。
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['**/*.ix_test.{ts,tsx}'],
    },
  }),
)
