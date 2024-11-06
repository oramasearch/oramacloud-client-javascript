import { defineConfig } from 'tsup'
import { fileURLToPath } from 'node:url'

const entry = 'src/vue/index.ts'
const outDir = fileURLToPath(new URL('dist/vue', import.meta.url))


export default defineConfig({
  entry: [entry],
  splitting: false,
  sourcemap: true,
  minify: true,
  external: ['vue'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  bundle: true,
  outDir,
  noExternal: ['@orama']
})
