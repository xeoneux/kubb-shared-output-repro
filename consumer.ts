// Imports that work today, without `output.shared`.
// Run `npm run typecheck` after `npm run generate` to see which ones break with it.

// Gap 2: the pets barrel no longer exports `Name` and `Color`.
import type { ColorKey, Name, Pet } from './gen/pets/types'
import { colorSchema, nameSchema, petSchema } from './gen/pets/zod'

// Gap 3: every schema of `components` moved to `gen/shared`, so this folder is gone.
import type { Name as ComponentsName } from './gen/components/types'

export const pet: Pet = { name: 'Rex' satisfies Name, color: 'red' satisfies ColorKey }
export const name: ComponentsName = 'Rex'
export const schemas = [nameSchema, colorSchema, petSchema]
