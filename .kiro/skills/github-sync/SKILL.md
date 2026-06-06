---
name: github-sync
description: Playbook untuk mengunggah (upload/commit/push) proyek Kebunku ke GitHub dan menjaganya tetap sinkron. Gunakan ketika pengguna meminta "upload ke github", "push", "commit dan sync", "simpan ke github", atau saat ingin memeriksa perbedaan dengan remote.
---

# Skill: GitHub Sync (Auto Upload) — Kebunku

Panduan baku untuk menyinkronkan repository ini dengan GitHub. Repo: **kebunku** (akun: DzoYaeger), branch utama biasanya `main`, remote `origin` via HTTPS (kredensial dari `gh`).

## Kapan dipakai
- Pengguna minta "upload ke GitHub" / "push" / "commit & sync" / "simpan perubahan".
- Setelah menyelesaikan sebuah fitur dan ingin menyimpannya ke remote.
- Ingin mengecek apakah ada perbedaan dengan remote.

## Prinsip keamanan
- **Jangan** `git push --force`, `reset --hard`, atau menulis ulang history tanpa permintaan eksplisit.
- **Jangan** commit rahasia: pastikan `.env`, `vendor/`, `node_modules/`, `dist/`, dan `*.sqlite` ter-ignore (sudah diatur di `.gitignore`).
- Stage perubahan yang relevan; tinjau `git status` sebelum commit.
- Gunakan pesan commit ringkas bergaya conventional (`feat:`, `fix:`, `chore:`, `docs:`).

## Alur upload (manual, disarankan)
1. Tinjau perubahan:
   ```
   git status
   git diff --stat
   ```
2. Stage & commit:
   ```
   git add -A
   git commit -m "feat: deskripsi singkat perubahan"
   ```
3. Push:
   ```
   git push
   ```
   Jika branch belum punya upstream:
   ```
   git push -u origin main
   ```

## Alur upload (cepat, via helper)
Untuk sekali jalan (stage + commit + push):
```
node .kiro/scripts/github-upload.mjs "pesan commit"
```
Tanpa argumen, memakai pesan default berstempel waktu (`chore: sync <waktu>`).

## Cek perbedaan dengan remote
```
node .kiro/scripts/startup-pull.mjs
```
Script ini `git fetch` lalu melaporkan apakah lokal tertinggal/mendahului remote (tidak auto-merge). Untuk menarik perubahan:
```
git pull --rebase
```

## Setup pertama kali (bila remote belum ada)
```
gh repo create kebunku --private --source=. --remote=origin --push
```

## Catatan
- Hook `agentSpawn` pada agent `kebunku` menjalankan `startup-pull.mjs` otomatis setiap sesi dimulai, sehingga perbedaan dengan GitHub langsung terlihat.
- Bila terjadi konflik saat `pull`, selesaikan manual lalu commit; jangan memaksa overwrite tanpa konfirmasi pengguna.
