#!/usr/bin/env node
/**
 * startup-pull.mjs — dijalankan oleh hook agentSpawn agent "kebunku".
 * Tujuan: saat pertama masuk Kiro CLI, cek apakah ada perbedaan dengan GitHub.
 *
 * Aman secara default: melakukan `git fetch` (tidak auto-merge) lalu melaporkan
 * apakah branch lokal tertinggal/mendahului remote, beserta daftar commit/berkas.
 * Selalu exit 0 agar STDOUT masuk ke konteks agent (bukan warning).
 */
import { execSync } from 'node:child_process';

function git(args) {
  return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
}

function safe(fn, fallback = '') {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Pastikan berada di dalam repo git.
const inRepo = safe(() => git('rev-parse --is-inside-work-tree')) === 'true';
if (!inRepo) {
  console.log('[github-sync] Belum ada repository git di folder ini.');
  process.exit(0);
}

const branch = safe(() => git('rev-parse --abbrev-ref HEAD'), 'HEAD');

// Cek ada remote upstream atau tidak.
const upstream = safe(() => git('rev-parse --abbrev-ref --symbolic-full-name @{u}'));
if (!upstream) {
  console.log(`[github-sync] Branch "${branch}" belum punya upstream (remote). Lewati pengecekan.`);
  process.exit(0);
}

// Fetch (cek koneksi). Jika offline/gagal, laporkan ramah dan keluar.
try {
  execSync('git fetch --quiet', { stdio: 'ignore', timeout: 15000 });
} catch {
  console.log('[github-sync] Tidak bisa fetch dari remote (mungkin offline). Lewati.');
  process.exit(0);
}

const counts = safe(() => git(`rev-list --left-right --count ${upstream}...HEAD`), '0\t0');
const [behindStr, aheadStr] = counts.split(/\s+/);
const behind = Number(behindStr) || 0;
const ahead = Number(aheadStr) || 0;

if (behind === 0 && ahead === 0) {
  console.log(`[github-sync] ✅ Sinkron dengan GitHub (${upstream}). Tidak ada perbedaan.`);
  process.exit(0);
}

const lines = [`[github-sync] Status terhadap ${upstream} (branch "${branch}"):`];

if (behind > 0) {
  lines.push(`  ⬇️  Tertinggal ${behind} commit dari remote. Pertimbangkan menjalankan: git pull`);
  const incoming = safe(() => git(`log --oneline HEAD..${upstream} --max-count=10`));
  if (incoming) lines.push('  Commit masuk:\n' + incoming.split('\n').map((l) => '    ' + l).join('\n'));
  const files = safe(() => git(`diff --name-only HEAD..${upstream}`));
  if (files) lines.push('  Berkas berbeda:\n' + files.split('\n').slice(0, 20).map((f) => '    ' + f).join('\n'));
}

if (ahead > 0) {
  lines.push(`  ⬆️  Mendahului ${ahead} commit dari remote (ada yang belum di-push).`);
}

if (behind > 0 && ahead > 0) {
  lines.push('  ⚠️  Branch divergen — selesaikan dengan hati-hati (pull lalu rebase/merge).');
}

console.log(lines.join('\n'));
process.exit(0);
