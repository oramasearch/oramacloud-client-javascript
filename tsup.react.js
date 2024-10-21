import { defineConfig } from 'tsup'
import { fileURLToPath } from 'url'

const entry = fileURLToPath(new URL('src/react/index.tsx', import.meta.url))
const outDir = fileURLToPath(new URL('dist/react', import.meta.url))

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
