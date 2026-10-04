import { build } from 'esbuild';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const result = await build({
  entryPoints: [join(root, 'src/live-markdown-editor.js')],
  outfile: join(root, 'assets/lib/live-markdown-editor.bundle.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  nodePaths: [join(directory, 'node_modules')],
  metafile: true,
  banner: { js: '/* YoursPPT local Markdown editor. Rebuild: npm --prefix scripts/editor-build ci --ignore-scripts && npm --prefix scripts/editor-build run build. Third-party notices: live-editor-LICENSES.txt */' }
});

const packages = new Set();
for (const filename of Object.keys(result.metafile.inputs)) {
  const match = filename.replaceAll('\\', '/').match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (match) packages.add(match[1]);
}
const notices = ['Third-party licenses for the bundled YoursPPT live Markdown editor.'];
for (const name of [...packages].sort()) {
  const packageRoot = join(directory, 'node_modules', name);
  const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  let license;
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try { license = await readFile(join(packageRoot, filename), 'utf8'); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!license) throw new Error(`Missing license text for ${name}`);
  notices.push(`\n${'='.repeat(72)}\n${name} ${metadata.version}\n${'='.repeat(72)}\n${license.trim()}\n`);
}
await writeFile(join(root, 'assets/lib/live-editor-LICENSES.txt'), `${notices.join('\n')}\n`);
console.log(`Built live-markdown-editor.bundle.js with ${packages.size} dependency notices.`);
