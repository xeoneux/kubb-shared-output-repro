# kubb `output.shared` reproduction

A small example for [kubb-labs/kubb#3660](https://github.com/kubb-labs/kubb/issues/3660), testing `output.shared` from [kubb-labs/kubb#4352](https://github.com/kubb-labs/kubb/pull/4352) (preview build of commit `4a562fe`).

`kubb.config.ts` uses the same options as our real setup: `adapterOas` with `validate`, `discriminator: 'propagate'` and `integerType: 'number'`, import paths without `.ts`, named barrels per plugin, and `plugin-ts`, `plugin-zod` (`inferred`), `plugin-axios` (Zod response validation, `returnType: 'full'`), `plugin-react-query` (hooks, infinite and suspense queries, our query and mutation keys), `plugin-msw` and `plugin-faker`. Every config runs all of them.

## The setup

Three specs, one Kubb config each, all with the same `output.shared` path. Every copy of a schema is identical, except where noted:

| Schema    | `components.yaml` | `pets.yaml` | `shop.yaml` | Note |
| --------- | :---------------: | :---------: | :---------: | ---- |
| `Name`    |         ✅        |      ✅     |      ✅     | |
| `Color`   |         ✅        |      ✅     |      ✅     | enum |
| `Page`    |         ✅        |      ✅     |      ✅     | page of an infinite query |
| `Tag`     |         ✅        |      ✅     |      ✅     | `shop.yaml` has a different description |
| `Badge`   |         ✅        |      ✅     |      ✅     | uses `Tag` |
| `Address` |                   |      ✅     |      ✅     | |
| `Cat`     |                   |      ✅     |      ✅     | part of the `Animal` discriminator in `pets.yaml` |
| `Pet`, `Animal`, `Dog` |      |      ✅     |             | `Pet` has `uuid`, `int64` and a deprecated field |
| `Product` |                   |             |      ✅     | |

`components.yaml` has no endpoints. It only holds common types, like a "shared components" file that other specs copy from.

`pets.yaml` and `shop.yaml` both have a `getHealth` operation, on different paths (`/pets/health` and `/products/health`).

## Run it

```sh
npm install
npm run repro              # generate, print a report, type-check consumer.ts and everything in gen/
npm run repro:diagnostics  # Kubb's diagnostics, without and with output.shared
npm run repro:broken       # the same, plus a spec with a broken $ref
npm run repro:names        # getHealth's response type name, in both orders
npm run repro:overlap      # shared path ./gen, which contains every output path
```

## What you'll see

`npm run repro` passes. Two checks show gaps:

```text
⚠ Not shared, since the specs define them differently: Tag, Cat. Each config keeps its own copy of these schemas.

Checks:
  OK   Name and Color (in all 3 specs) are written once, to gen/_shared
  OK   Address (in 2 of 3 specs) is written once, to gen/_shared
  OK   every spec's barrel still exports Name
  OK   gen/components/types still exists, although all its schemas are shared
  GAP  Tag (same in 2 specs, different in 1) is shared by the 2 that agree. Written to: components, pets, shop
  GAP  Badge (identical in all 3 specs, uses Tag) is written once. Written to: components, pets, shop
  NOTE Cat is the same in pets.yaml and shop.yaml, but the Animal discriminator in pets changes it. Written to: pets, shop
```

`Badge` is identical everywhere, but it uses `Tag`, so it isn't shared either. The warning doesn't name it.

`npm run repro:diagnostics` and `npm run repro:broken`: with `output.shared`, every diagnostic is lost, errors included. A broken `$ref` passes silently and generates `owner?: unknown`:

```text
$ npm run repro:diagnostics
without output.shared: exit code 0, diagnostics: info KUBB_DEPRECATED
with output.shared:    exit code 0, diagnostics: (none)

$ npm run repro:broken
without output.shared: exit code 1, diagnostics: info KUBB_DEPRECATED, error KUBB_REF_NOT_FOUND, warning KUBB_INVALID_SPEC
with output.shared:    exit code 0, diagnostics: (none)
```

`npm run repro:names`: the response overrides call the exported `resolverTs` / `resolverZod` / `resolverFaker`. Those keep one list of used names for the whole run, so the second spec with `getHealth` gets `GetHealthResponse2`, and which spec that is depends on the order. Asking `this` (the build's resolver) fixes it. This happens with or without `output.shared`:

```text
exported resolver, normal order:  pets GetHealthQueryResponse   shop GetHealthResponse2
exported resolver, reverse order: pets GetHealthResponse2       shop GetHealthQueryResponse
this resolver, normal order:      pets GetHealthQueryResponse   shop GetHealthQueryResponse
this resolver, reverse order:     pets GetHealthQueryResponse   shop GetHealthQueryResponse
```

`npm run repro:overlap`: the shared `types/`, `zod/` and `faker/` folders end up next to the spec folders in `gen/`, without a warning.

### Fixed since the last round

- With every plugin, generation used to crash with `Cannot read properties of undefined (reading 'ensureItem')`. The latest plugin releases (`plugin-axios@5.11.0`, `plugin-react-query@5.8.0`, `plugin-msw@6.1.0`, `plugin-faker@5.3.0`) don't call `ctx.cache` any more.
- With the default enum names, `Pet.ts` imported `Color` while `Color.ts` only exported `ColorKey`. The generated code type-checks now, so `repro:enum` is gone.

## Files

- `specs/`: the three OpenAPI specs
- `specs-broken/`: a spec with a broken `$ref`, used by `repro:broken`
- `kubb.config.ts`: one config per spec, all sharing `gen/_shared`. Same plugins and options as our real config. The comment at the top lists the switches.
- `react-query.ts`: our query keys, mutation keys and page params for the React Query plugin, copied from our repo
- `consumer.ts`: imports that work without `output.shared`
- `report.ts`: prints where each schema was written
- `repro-diagnostics.ts`: generates without and with `output.shared` and prints the diagnostics
- `names.ts`: generates in both orders, with both resolvers, and prints `getHealth`'s response type name
