// Imports that work without `output.shared`. They must keep working with it.

// Each spec's barrel must still export the shared schemas it defines.
import type { Address, Color, Name, Pet } from './gen/pets/types'
import { addressSchema, colorSchema, nameSchema, petSchema } from './gen/pets/zod'
import type { Product } from './gen/shop/types'

// Every schema of `components` is shared, but its folder must still exist.
import type { Name as ComponentsName } from './gen/components/types'

const home: Address = { street: 'Main St 1', city: 'Springfield' }
export const pet: Pet = { id: '6f1c5c2e-3b6a-4b55-9a43-4f9e2d1b7c11', name: 'Rex' satisfies Name, color: 'red' satisfies Color, home }
export const product: Product = { id: '0b8f1a9e-2c3d-4e5f-8a7b-6c5d4e3f2a1b', name: 'Bowl', color: 'blue', warehouse: home }
export const name: ComponentsName = 'Rex'
export const schemas = [nameSchema, colorSchema, addressSchema, petSchema]
