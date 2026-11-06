// Generates 4 times (normal and reverse order, exported resolver and `this`) and prints the name of
// `getHealth`'s response type in pets and shop. Both specs have `getHealth`.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const responseType = (spec: string): string =>
  readFileSync(`gen/${spec}/types/GetHealth.ts`, 'utf8').match(/export type (GetHealth(?:Query|Mutation)?Response\d*) =/)?.[1] ?? '?';

for (const resolver of ['exported', 'this']) {
  for (const order of ['normal', 'reverse']) {
    const env = {
      ...process.env,
      ...(order === 'reverse' ? { REVERSE: '1' } : {}),
      ...(resolver === 'this' ? { RESPONSE_NAME: 'this' } : {}),
    };
    spawnSync('npx', ['kubb', 'generate'], { env, encoding: 'utf8' });
    console.log(`${`${resolver} resolver, ${order} order:`.padEnd(33)} pets ${responseType('pets').padEnd(24)} shop ${responseType('shop')}`);
  }
}
