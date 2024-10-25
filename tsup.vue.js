import { defineConfig } from 'tsup'
import { fileURLToPath } from 'url'

const entry = fileURLToPath(new URL('src/vue/index.ts', import.meta.url))
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
