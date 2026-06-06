#!/usr/bin/env node
/**
 * github-upload.mjs — helper "auto upload" ke GitHub.
 * Pemakaian:
 *   node .kiro/scripts/github-upload.mjs "pesan commit"
 * Bila pesan tidak diberikan, memakai pesan default berstempel waktu.
 *
 * Langkah: stage semua perubahan -> commit (bila ada perubahan) -> push ke upstream.
 * Aman: tidak melakukan force-push, tidak menyentuh history.
 */
import { execSync } from 'node:child_process';

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString().trim();
}
function tryRun(cmd) {
  try {
    return { ok: true, out: run(cmd) };
  } catch (e) {
    return { ok: false, out: (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '') };
  }
}

// Pastikan repo git.
try {
  run('git rev-parse --is-inside-work-tree');
} catch {
  console.error('Bukan repository git. Jalankan dulu: git init && gh repo create.');
  process.exit(1);
}

const msgArg = process.argv.slice(2).join(' ').trim();
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
const message = msgArg || `chore: sync ${stamp}`;

// Ada perubahan?
const status = run('git status --porcelain');
if (!status) {
  console.log('Tidak ada perubahan untuk di-commit.');
} else {
  run('git add -A');
  const commit = tryRun(`git commit -m "${message.replace(/"/g, '\\"')}"`);
  console.log(commit.ok ? `Commit dibuat: ${message}` : `Commit dilewati: ${commit.out}`);
}

// Tentukan branch & upstream.
const branch = run('git rev-parse --abbrev-ref HEAD');
let hasUpstream = true;
try {
  run('git rev-parse --abbrev-ref --symbolic-full-name @{u}');
} catch {
  hasUpstream = false;
}

const push = hasUpstream ? tryRun('git push') : tryRun(`git push -u origin ${branch}`);
if (push.ok) {
  console.log(`✅ Berhasil push ke GitHub (branch "${branch}").`);
} else {
  console.error(`Gagal push:\n${push.out}`);
  process.exit(1);
}
