import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsup'

const entry = 'src/index.tsx'
const outDir = fileURLToPath(new URL('dist', import.meta.url))

export default defineConfig({
  entry: [entry],
  splitting: false,
  sourcemap: true,
  minify: true,
  external: ['react'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  bundle: true,
  outDir,
  noExternal: ['@orama']
})
