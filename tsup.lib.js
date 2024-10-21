import { defineConfig } from 'tsup'
import { fileURLToPath } from 'url'


const entry = fileURLToPath(new URL('src/index.ts', import.meta.url))
const outDir = fileURLToPath(new URL('dist', import.meta.url))

export default defineConfig({
  entry: [entry],
  splitting: false,
  sourcemap: true,
  minify: true,
  format: ['cjs', 'esm', 'iife'],
  globalName: 'OramaClient',
  platform: 'neutral',
  dts: true,
  clean: true,
  bundle: true,
  outDir,
  noExternal: ['@orama', '@paralleldrive']
})
