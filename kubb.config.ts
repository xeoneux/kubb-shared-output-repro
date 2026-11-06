// The same plugins and options as our real config (kubb.config.base.ts), with one config per spec.
// Differences: specs are listed by hand, output goes to `gen/` instead of `generated/`, and the
// switches below.
import { adapterOas } from '@kubb/adapter-oas'
import { parserTs, parserTsx } from '@kubb/parser-ts'
import { pluginAxios } from '@kubb/plugin-axios'
import { pluginFaker, resolverFaker } from '@kubb/plugin-faker'
import { pluginMsw } from '@kubb/plugin-msw'
import { pluginReactQuery } from '@kubb/plugin-react-query'
import { pluginTs, resolverTs } from '@kubb/plugin-ts'
import { pluginZod, resolverZod } from '@kubb/plugin-zod'
import type { UserConfig } from 'kubb'
import { defineConfig } from 'kubb/config'
import { ast } from 'kubb/kit'
import { readFileSync } from 'node:fs'
import { PAGE_PARAMS, createMutationKey, createQueryKey } from './react-query.ts'

// Switches, so each case in the README can run on its own:
// - NO_SHARED=1: generate without `output.shared`, to compare.
// - SHARED_PATH=<path>: use another shared path.
// - WITH_BROKEN=1: add a spec with a broken `$ref`.
// - REVERSE=1: run the configs in reverse order.
// - RESPONSE_NAME=this: name responses through `this` (the build's resolver) instead of the exported `resolverTs` & co.
const env = process.env

const OUTPUT_DIR = 'gen'
const shared = env.NO_SHARED ? undefined : { path: env.SHARED_PATH ?? `${OUTPUT_DIR}/_shared` }

// Each plugin folder gets an index.ts, which the package `exports` point at.
const barrel = { type: 'named' } as const

// `<Operation>Response` becomes `<Operation>QueryResponse` / `<Operation>MutationResponse`, as v4 did.
// Without it, the name clashes with the specs' own `<Operation>Response` schemas and the barrel
// fails with `KUBB_BARREL_DUPLICATE_EXPORT`.
const kind = (node: ast.OperationNode) => (ast.isHttpOperationNode(node) && node.method.toLowerCase() === 'get' ? 'Query' : 'Mutation')

// Default, and what we ship today: rename what the exported resolver returns. The exported resolver
// keeps one list of used names for every config in the run, so `getHealth` (in pets and shop)
// becomes `GetHealthResponse2` in whichever spec runs second.
const fromExported = (base: string, node: ast.OperationNode): string => base.replace(/Response(Schema)?$/, `${kind(node)}Response$1`)

// RESPONSE_NAME=this: ask the build's own resolver (`this`), which starts empty for each config.
type NameResolver = { name(name: string): string; resolveName(options: { key: Array<string | undefined>; name: string }): string }
function fromThis(this: NameResolver, node: ast.OperationNode): string {
  return this.resolveName({ key: ['operation', node.method, node.path, 'response', 'response'], name: this.name(`${node.operationId} ${kind(node)} Response`) })
}

const responseName = (exported: { response: { response: (node: ast.OperationNode) => string } }) =>
  env.RESPONSE_NAME === 'this' ? fromThis : (node: ast.OperationNode) => fromExported(exported.response.response(node), node)

const service = (JSON.parse(readFileSync('package.json', 'utf8')) as { name: string }).name

const createSingleConfig = (inputPath: string, outputDir: string): UserConfig => ({
  root: '.',
  name: outputDir,
  input: inputPath,
  output: {
    clean: true,
    path: outputDir,
    ...(shared ? { shared } : {}),
    defaultBanner: false,
  },
  // Drop `.ts` from import paths, as v4 did.
  parsers: [parserTs({ extension: { '.ts': '' } }), parserTsx({ extension: { '.ts': '' } })],
  adapter: adapterOas({
    validate: true,
    discriminator: 'propagate',
    unknownType: 'unknown',
    // int64 becomes `number`, as in v4. The v5 default is `bigint`.
    integerType: 'number',
  }),
  plugins: [
    pluginTs({
      output: { path: './types', barrel },
      // Enum types use the schema name (`Color`, not `ColorKey`), as in v4.
      enum: { typeSuffix: '' },
      resolver: { response: { response: responseName(resolverTs) } },
    }),
    pluginZod({
      inferred: true,
      output: { path: './zod', barrel },
      resolver: { response: { response: responseName(resolverZod) } },
    }),
    pluginAxios({
      // Every call validates its response with the operation's Zod schema.
      validator: { response: 'zod' },
      output: { path: './axios', barrel },
      // Calls resolve to `{ status, data, response, … }`, like v4's `dataReturnType: 'full'`.
      returnType: 'full',
    }),
    pluginReactQuery({
      client: 'axios',
      // Generate the `use*` hooks. The v5 default is false.
      hooks: true,
      output: { path: './hooks', barrel },
      // Operations with a `page` query param get infinite hooks.
      infinite: { queryParam: 'page', initialPageParam: 0, ...PAGE_PARAMS },
      suspense: {},
      queryKey: createQueryKey(service),
      mutationKey: createMutationKey(service),
    }),
    pluginMsw({
      // Match any origin, whatever `baseURL` the client uses.
      baseURL: '*',
      output: { path: './msw', barrel },
    }),
    pluginFaker({
      output: { path: './faker', barrel },
      resolver: { response: { response: responseName(resolverFaker) } },
    }),
  ],
})

const specs = [
  ['specs', 'components'],
  ['specs', 'pets'],
  ['specs', 'shop'],
  ...(env.WITH_BROKEN ? [['specs-broken', 'broken']] : []),
]
const configs = specs.map(([dir, spec]) => createSingleConfig(`${dir}/${spec}.yaml`, `${OUTPUT_DIR}/${spec}`))

export default defineConfig(env.REVERSE ? configs.reverse() : configs)
