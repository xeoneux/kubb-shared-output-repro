// Generates without and with `output.shared`, and prints the exit code and Kubb diagnostics of each run.
// `npm run repro:diagnostics` adds a spec with a broken `$ref` (WITH_BROKEN=1).
import { spawnSync } from 'node:child_process';

for (const shared of [false, true]) {
  const env = { ...process.env, ...(shared ? {} : { NO_SHARED: '1' }) };
  const run = spawnSync('npx', ['kubb', 'generate'], { env, encoding: 'utf8' });
  const output = `${run.stdout}\n${run.stderr}`;
  const diagnostics = [...new Set(output.match(/(info|warning|error) KUBB_[A-Z_]+/g) ?? [])];
  console.log(
    `${shared ? 'with output.shared:   ' : 'without output.shared:'} exit code ${run.status}, diagnostics: ${diagnostics.join(', ') || '(none)'}`,
  );
}
