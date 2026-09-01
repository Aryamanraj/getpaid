import * as fs from 'node:fs';
import * as path from 'node:path';

const env = process.env.NODE_ENV || 'development';

// `nest start` runs from apps/api with __dirname = dist/config, so the
// working directory is the reliable anchor. The __dirname form covers a
// process launched from elsewhere with the compiled tree intact.
const candidates = [
  path.join(process.cwd(), 'env', `.env.${env}`),
  path.join(__dirname, '..', '..', 'env', `.env.${env}`),
  path.join(__dirname, '..', 'env', `.env.${env}`),
];
const p = candidates.find((c) => fs.existsSync(c)) ?? candidates[0];
console.log(`Loading environment from ${p}`);

const dotEnvOptions = { path: p };

export { dotEnvOptions };
