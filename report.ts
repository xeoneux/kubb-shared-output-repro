// Prints where each schema was written, so the results are easy to see.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const specs = ['components', 'pets', 'shop'];

const types = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f !== 'index.ts').map((f) => f.replace('.ts', '')) : [];

const barrel = (dir: string): string[] =>
  existsSync(`${dir}/index.ts`)
    ? [...readFileSync(`${dir}/index.ts`, 'utf8').matchAll(/export type \{([^}]*)\}/g)].flatMap((m) =>
        m[1].split(',').map((name) => name.trim()).filter(Boolean),
      )
    : [];

console.log('\nTypes written per folder:');
for (const folder of ['_shared', ...specs]) {
  console.log(`  gen/${folder}/types:`.padEnd(26), types(`gen/${folder}/types`).join(', ') || '(none)');
}

const where = (name: string): string[] => ['_shared', ...specs].filter((folder) => types(`gen/${folder}/types`).includes(name));
const check = (ok: boolean, text: string) => console.log(`  ${ok ? 'OK  ' : 'GAP '} ${text}`);

console.log('\nChecks:');
check(where('Name').join() === '_shared' && where('Color').join() === '_shared', 'Name and Color (in all 3 specs) are written once, to gen/_shared');
check(where('Address').join() === '_shared', 'Address (in 2 of 3 specs) is written once, to gen/_shared');
check(specs.every((spec) => barrel(`gen/${spec}/types`).includes('Name')), "every spec's barrel still exports Name");
check(existsSync('gen/components/types/index.ts'), 'gen/components/types still exists, although all its schemas are shared');
check(where('Tag').includes('_shared'), `Tag (same in 2 specs, different in 1) is shared by the 2 that agree. Written to: ${where('Tag').join(', ')}`);
check(where('Badge').join() === '_shared', `Badge (identical in all 3 specs, uses Tag) is written once. Written to: ${where('Badge').join(', ')}`);
console.log(`  NOTE Cat is the same in pets.yaml and shop.yaml, but the Animal discriminator in pets changes it. Written to: ${where('Cat').join(', ')}`);
console.log();
