import { pluginTs } from '@kubb/plugin-ts'
import { pluginZod } from '@kubb/plugin-zod'
import { defineConfig } from 'kubb/config'

// Set NO_SHARED=1 to see the output without `output.shared`.
const shared = process.env.NO_SHARED ? undefined : { path: './gen/shared' }

const config = (spec: string) => ({
  root: '.',
  input: `./specs/${spec}.yaml`,
  output: { path: `./gen/${spec}`, clean: true, shared, barrel: { type: 'named' as const } },
  plugins: [pluginTs({ output: { path: './types' } }), pluginZod({ output: { path: './zod' } })],
})

export default defineConfig([config('components'), config('pets'), config('shop')])
