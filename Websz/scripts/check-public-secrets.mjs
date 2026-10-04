import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(process.cwd(), '..');
const trackedFiles = execFileSync('git', [
  '-c', `safe.directory=${repositoryRoot}`,
  '-C', repositoryRoot,
  'ls-files', '-z'
], {
  encoding: 'utf8'
}).split('\0').filter(Boolean);

const forbiddenPaths = [
  /(^|\/)\.env$/i,
  /(^|\/)scanner\.config\.json$/i,
  /(^|\/)database-exports\//i
];

const secretPatterns = [
  ['Google API key', /AIza[0-9A-Za-z_-]{20,}/g],
  ['GitHub token', /(?:github_pat_|gh[pousr]_)[0-9A-Za-z_]{20,}/g],
  ['OpenAI-style key', /sk-(?:proj-)?[0-9A-Za-z_-]{20,}/g],
  ['AWS access key', /AKIA[0-9A-Z]{16}/g],
  ['Stripe live secret', /sk_live_[0-9A-Za-z]{16,}/g],
  ['JWT credential', /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+/g],
  ['Private key', /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g]
];

const findings = [];

for (const relativePath of trackedFiles) {
  const normalizedPath = relativePath.replaceAll('\\', '/');
  if (forbiddenPaths.some((pattern) => pattern.test(normalizedPath))) {
    findings.push(`${normalizedPath}: private file must not be tracked`);
    continue;
  }

  let data;
  try {
    data = readFileSync(resolve(repositoryRoot, relativePath));
  } catch {
    continue;
  }
  if (data.includes(0)) continue;

  const text = data.toString('utf8');
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`${normalizedPath}: ${label}`);
  }
}

if (findings.length) {
  console.error('Security check failed. Potential public secret(s) detected:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Security check passed for ${trackedFiles.length} tracked files.`);
