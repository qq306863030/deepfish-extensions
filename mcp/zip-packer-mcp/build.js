import esbuild from 'esbuild';

const banner = `#!/usr/bin/env node
import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirnameFn } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirnameFn(__filename);
`;

await esbuild.build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/index.js',
  banner: {
    js: banner
  }
});

console.log('Build completed successfully: dist/index.js');
