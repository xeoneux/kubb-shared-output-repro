// Prints where each schema was written, so the gaps are easy to see.
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const types = (dir: string): string[] | null => (existsSync(dir) ? readdirSync(dir).filter((f) => f !== 'index.ts').map((f) => f.replace('.ts', '')) : null)
const barrel = (dir: string): string[] | null => (existsSync(`${dir}/index.ts`) ? [...readFileSync(`${dir}/index.ts`, 'utf8').matchAll(/export type \{ (\w+)/g)].map((m) => m[1]) : null)

console.log('\nTypes written per folder:')
for (const folder of ['shared', 'components', 'pets', 'shop']) {
  const files = types(`gen/${folder}/types`)
  console.log(`  gen/${folder}/types:`.padEnd(26), files ? files.join(', ') : '(missing)')
}

console.log('\nExported from each barrel (gen/<spec>/types/index.ts):')
for (const folder of ['components', 'pets', 'shop']) {
  const names = barrel(`gen/${folder}/types`)
  console.log(`  ${folder}:`.padEnd(14), names ? names.join(', ') : '(missing)')
}

const check = (ok: boolean, text: string) => console.log(`  ${ok ? 'OK  ' : 'GAP '} ${text}`)
const pets = types('gen/pets/types') ?? []
const shop = types('gen/shop/types') ?? []
const sharedTypes = types('gen/shared/types') ?? []

console.log('\nChecks:')
check(sharedTypes.includes('Name') && sharedTypes.includes('Color'), 'Name and Color (in all 3 specs) are written once, to gen/shared')
check(!(pets.includes('Address') && shop.includes('Address')), 'Address (in 2 of 3 specs) is written once')
check((barrel('gen/pets/types') ?? []).includes('Name'), 'gen/pets/types still exports Name')
check(existsSync('gen/components/types/index.ts'), 'gen/components/types still exists')
console.log()
