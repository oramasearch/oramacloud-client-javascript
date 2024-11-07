import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsup'

const entry = 'src/proxy.ts'
const outDir = fileURLToPath(new URL('dist', import.meta.url))

export default defineConfig({
  entry: [entry],
  splitting: false,
  sourcemap: true,
  minify: true,
  format: ['cjs', 'esm', 'iife'],
  globalName: 'OramaProxy',
  platform: 'neutral',
  dts: true,
  clean: true,
  bundle: true,
  outDir,
  noExternal: ['@orama', '@paralleldrive']
})
