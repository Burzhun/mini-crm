import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const localFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
const secrets = new Set();
function isPrivileged(value) {
  if (value.startsWith('sb_secret_')) return true;
  try {
    return (
      JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role === 'service_role'
    );
  } catch {
    return false;
  }
}
for (const file of localFiles) {
  if (!existsSync(file)) continue;
  for (const value of Object.values(parseEnv(readFileSync(file, 'utf8'))))
    if (isPrivileged(value)) secrets.add(value);
}
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
const findings = [];
function inspect(content, location) {
  if ([...secrets].some((secret) => content.includes(secret))) {
    findings.push({ location, reason: 'configured server key' });
    return;
  }
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(content)) {
    findings.push({ location, reason: 'secret key pattern' });
    return;
  }
  const tokens = content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  if (tokens.some(isPrivileged)) findings.push({ location, reason: 'service_role JWT' });
}
const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
for (const file of tracked) {
  if (existsSync(file)) inspect(readFileSync(file, 'utf8'), `working tree: ${file}`);
}
const versions = git('rev-list', '--objects', '--all').split('\n').filter(Boolean);
const objectIds = [...new Set(versions.map((line) => line.split(' ')[0]))];
const batch = execFileSync('git', ['cat-file', '--batch'], {
  input: objectIds.join('\n') + '\n',
  windowsHide: true,
  maxBuffer: 128 * 1024 * 1024,
});
let offset = 0,
  blobCount = 0;
while (offset < batch.length) {
  const end = batch.indexOf(10, offset);
  if (end < 0) break;
  const [id, type, size] = batch.subarray(offset, end).toString().split(' ');
  const bytes = Number(size);
  offset = end + 1;
  if (type === 'blob') {
    blobCount++;
    inspect(batch.subarray(offset, offset + bytes).toString('utf8'), `Git blob: ${id}`);
  }
  offset += bytes + 1;
}
let buildFiles = 0;
function scanBuild(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) scanBuild(file);
    else {
      buildFiles++;
      inspect(readFileSync(file, 'utf8'), `browser build: ${file}`);
    }
  }
}
if (!existsSync('dist/index.html'))
  throw new Error('Build is missing; run npm run build before this audit.');
scanBuild('dist');
const committedEnv = git(
  'log',
  '--all',
  '--format=%H',
  '--',
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
).trim();
if (committedEnv)
  findings.push({ location: 'Git history', reason: 'environment file was committed' });
console.log(
  JSON.stringify(
    {
      trackedFiles: tracked.length,
      gitBlobs: blobCount,
      buildFiles,
      configuredServerKeysChecked: secrets.size,
      findings,
    },
    null,
    2,
  ),
);
if (findings.length) process.exitCode = 1;
