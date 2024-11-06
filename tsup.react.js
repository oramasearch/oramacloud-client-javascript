import { defineConfig } from 'tsup'
import { fileURLToPath } from 'node:url'

const entry = 'src/react/index.tsx'
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
