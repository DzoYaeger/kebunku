---
inclusion: always
---

# Design System (Agrogrow / Kebunku UI)

Sumber kebenaran visual untuk UI Ionic React. Estetika: modern, lembut, kompak, minimalis, light-mode dominan.

## 1. Tipografi
- **Font:** `Plus Jakarta Sans`, sans-serif (lembut, bersih, sangat terbaca).
- **Skala (kompak, gaya aplikasi mobile teknikal modern):**
  - Heading Large: `1.25rem (20px)` — Bold / SemiBold
  - Heading Medium: `1rem (16px)` — SemiBold
  - Body Standard: `0.875rem (14px)` — Regular (ukuran teks dominan)
  - Caption / Sub-text: `0.75rem (12px)` — Regular / Medium (tanggal, nomor bed, metrik)

## 2. Palet Warna (minimalis & natural)
Hindari blok background tebal/jenuh. Gunakan layout terang dengan border & shadow halus.
- **Background:** Base Light `#F8FAFC` (Slate 50) | Card/Surface `#FFFFFF`
- **Primary (Accent):** Soft Deep Emerald `#0F5132` / `#198754` — dipakai hemat untuk active state, tombol utama, metrik sukses.
- **Teks Netral:** Slate Dark `#1E293B` (Slate 800) untuk header | Slate Muted `#64748B` (Slate 500) untuk caption.

### Badge / Alert
| Status | Background | Teks |
|--------|-----------|------|
| Semai | `#FEF3C7` (Soft Amber) | `#B45309` |
| Pindah Tanam / Aktif | `#DCFCE7` (Soft Green) | `#15803D` |
| Kas Keluar | `#FFE4E6` (Soft Rose) | `#B91C1C` |

## 3. Root Shell Layout (`App.tsx`)
`IonTabs` dengan bottom navigation bar yang bersih dan low-profile. Ikon **`outline`** saat tidak aktif, **`filled` emerald** saat aktif.

```text
[ Screen Content Area ]
--------------------------------------------------
[ 🔲 Lahan ]    [ 📝 Aktivitas ]    [ 💳 Keuangan ]
```

## 4. Aturan Implementasi Komponen
- Bangun komponen high-fidelity & interaktif dengan `@ionic/react` + `ionicons/icons`.
- **Mobile-first:** responsif penuh 360px–430px; jangan hardcode lebar yang merusak layout.
- **PWA & performa:** component tree datar, hindari micro-animation berat, conditional rendering untuk list besar (target 60 FPS di HP mid-range).
- **Tailwind + Ionic:** Tailwind untuk micro-layout (margin/padding/flex), Ionic untuk wrapper native inti.
- Gunakan border & shadow halus, sudut membulat lembut; jangan gunakan warna jenuh sebagai blok besar.
