import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';
import { expect, it } from 'vitest';

const root = join(cwd(), 'src');
const sources = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const full = join(directory, entry.name);
  return entry.isDirectory() ? sources(full) : /\.(js|jsx)$/.test(full) && !/\.test\./.test(full) ? [full] : [];
});

it('keeps every workspace on the shared confirmation-aware HTTP client', () => {
  const bypasses = [];
  for (const file of sources(root)) {
    const name = relative(root, file);
    const source = readFileSync(file, 'utf8');
    if (!['core/api/axios.js', 'core/api/criticalActionGuard.js'].includes(name) && /from\s+['"]axios['"]/.test(source)) bypasses.push(name);
    if (/\bfetch\s*\(|new\s+XMLHttpRequest\s*\(/.test(source)) bypasses.push(name);
  }
  expect(bypasses).toEqual([]);
});
