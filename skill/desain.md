# UI/UX Specification: Agrogrow PWA (Farm & Cashflow Management)
This document acts as the definitive design system, ruleset, and capability profile for generating the frontend user interface using Ionic React.

---

## 🛠 AI IDE Execution Skills & Instructions
When implementing components or pages from this document, the AI IDE must follow these strict operational parameters:
1. **Component Scope:** Build high-fidelity, interactive React components using `@ionic/react` and Ionic Icons (`ionicons/icons`).
2. **Mobile-First Constraints:** Ensure absolute responsiveness for standard mobile viewports (360px - 430px width). Never hardcode widths that break mobile layout.
3. **PWA & Performance Ready:** Keep component tree flat, avoid heavy micro-animations, and utilize conditional rendering for large lists to maintain 60 FPS on mid-range devices.
4. **Tailwind Co-existence:** Use Tailwind CSS for micro-layouts (margins, paddings, flex alignments) while relying on Ionic for the core native wrapper elements.

---

## 🎨 Design System & Visual Guidelines

### 1. Typography (Modern, Soft, & Compact)
* **Font Family:** `Plus Jakarta Sans`, sans-serif (Soft curves, clean, highly readable, modern aesthetic).
* **Font Scale:** Compact size scale to mimic highly technical modern mobile applications.
  * Heading Large: `1.25rem (20px)` - Bold / SemiBold
  * Heading Medium: `1rem (16px)` - SemiBold
  * Body Standard: `0.875rem (14px)` - Regular (Dominant text size)
  * Caption/Sub-text: `0.75rem (12px)` - Regular / Medium (For dates, bed numbers, metrics)

### 2. Color Palette (Minimalist & Natural)
Avoid heavy, saturated background blocks. Use a clean, light-mode dominant layout with subtle borders and shadows.
* **Background:** Base Light (`#F8FAFC` - Slate 50) | Card/Surface (`#FFFFFF`)
* **Primary (Accent):** Soft Deep Emerald (`#0F5132` / `#198754`) - Used sparingly for active states, primary buttons, and successful metrics.
* **Neutral Text:** Slate Dark (`#1E293B` - Slate 800) for headers | Slate Muted (`#64748B` - Slate 500) for captions.
* **Alerts/Badges:**
  * Semai: Soft Amber (`#FEF3C7` background, `#B45309` text)
  * Pindah Tanam / Aktif: Soft Green (`#DCFCE7` background, `#15803D` text)
  * Kas Keluar: Soft Rose (`#FFE4E6` background, `#B91C1C` text)

---

## 📱 App Architecture & Screen Layouts

### 1. Root Shell Layout (`App.tsx`)
Using `IonTabs` with a clean, low-profile bottom navigation bar. Icons use `outline` style when inactive, and `filled` emerald style when active.

```text
[ Screen Content Area ]
--------------------------------------------------
[ 🔲 Lahan ]       [ 📝 Aktivitas ]    [ 💳 Keuangan ]