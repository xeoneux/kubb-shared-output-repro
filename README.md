# kubb `output.shared` reproduction

A small example for [kubb-labs/kubb#3660](https://github.com/kubb-labs/kubb/issues/3660), testing the `output.shared` option from [kubb-labs/kubb#4352](https://github.com/kubb-labs/kubb/pull/4352) (preview build of commit `2070b16`).

## The setup

Three specs, one Kubb config each, all with the same `output.shared` path:

| Schema    | `components.yaml` | `pets.yaml` | `shop.yaml` |
| --------- | :---------------: | :---------: | :---------: |
| `Name`    |         ✅        |      ✅     |      ✅     |
| `Color`   |         ✅        |      ✅     |      ✅     |
| `Address` |                   |      ✅     |      ✅     |
| `Pet`     |                   |      ✅     |             |
| `Product` |                   |             |      ✅     |

Every copy of a schema is identical. `components.yaml` has no endpoints. It only holds common types, like a "shared components" file that other specs copy from.

## Run it

```sh
npm install
npm run repro                    # generate with output.shared, print a report, type-check consumer.ts
```

To compare with the output without `output.shared`:

```sh
npm run generate:without-shared
npm run typecheck                # passes
```

## What you'll see

```text
Types written per folder:
  gen/shared/types:        Color, Name
  gen/components/types:    (missing)
  gen/pets/types:          Address, ListPets, Pet
  gen/shop/types:          Address, ListProducts, Product

Checks:
  OK   Name and Color (in all 3 specs) are written once, to gen/shared
  GAP  Address (in 2 of 3 specs) is written once
  GAP  gen/pets/types still exports Name
  GAP  gen/components/types still exists
```

```text
consumer.ts(5,15): error TS2305: Module '"./gen/pets/types"' has no exported member 'ColorKey'.
consumer.ts(5,25): error TS2305: Module '"./gen/pets/types"' has no exported member 'Name'.
consumer.ts(6,10): error TS2305: Module '"./gen/pets/zod"' has no exported member 'colorSchema'.
consumer.ts(6,23): error TS2305: Module '"./gen/pets/zod"' has no exported member 'nameSchema'.
consumer.ts(9,45): error TS2307: Cannot find module './gen/components/types' or its corresponding type declarations.
```

See discussion in [kubb-labs/kubb#3660](https://github.com/kubb-labs/kubb/issues/3660).

## Files

- `specs/`: the three OpenAPI specs
- `kubb.config.ts`: one config per spec, all sharing `./gen/shared`
- `consumer.ts`: imports that work without `output.shared`
- `report.ts`: prints where each schema was written
