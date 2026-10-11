import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Public release information only: never include environment variables,
// account IDs, authentication data or repository credentials in the manifest.
export async function createReleaseMetadata(projectRoot) {
  const release = JSON.parse(await readFile(join(projectRoot, 'release.json'), 'utf8'));
  if (!/^[a-z0-9.-]{1,80}$/.test(release.id) || !/^\d+\.\d+\.\d+$/.test(release.version)
      || !/^\d{4}-\d{2}-\d{2}$/.test(release.releasedOn) || !Array.isArray(release.changes)) {
    throw new Error('Invalid public release metadata.');
  }
  const hash = createHash('sha256');
  for (const path of ['release.json', 'index.html', 'js/app.js', 'js/mobile.js', 'css/style.css', 'css/tailwind.css']) {
    hash.update(path).update('\0').update((await readFile(join(projectRoot, path), 'utf8')).replace(/\r\n/g, '\n'));
  }
  return { ...release, buildId: hash.digest('hex'), builtAt: new Date().toISOString() };
}
