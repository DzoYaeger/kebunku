# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kebunku (Agrogrow)** is a PWA for farm/garden management. It is designed for small-to-medium farmers to use in the field via mobile phones. The architecture is **offline-first** with an AI assistant for crop care.

The repository is a monorepo split into:
- `/backend`: Laravel 12 API (PHP 8.3+, MariaDB) using Sanctum for stateless API auth.
- `/frontend`: React 18 + Ionic 7 PWA (Vite, TypeScript, Tailwind, Zustand, Dexie.js for IndexedDB).

## Common Development Commands

Always run commands in their respective directories!

### Backend (`/backend`)
- **Dev Server:** `php artisan serve`
- **Migrate DB:** `php artisan migrate`
- **Refresh DB (destructive):** `php artisan migrate:fresh --seed` (Always confirm before running this!)
- **Run Tests:** `php artisan test` (Run this after backend code changes to ensure everything works)
- **Generate Classes:**
  - `php artisan make:resource [Name]Resource`
  - `php artisan make:request [Name]Request`
  - `php artisan make:controller Api/[Name]Controller`
- **Storage:** `php artisan storage:link` (required for image uploads)

### Frontend (`/frontend`)
- **Install dependencies:** `npm install`
- **Dev Server:** `npm run dev`
- **Build PWA for Production:** `npm run build` (outputs to `dist/`, generates service worker via `vite-plugin-pwa`)
- **Preview Production Build:** `npm run preview`

## High-Level Architecture & Conventions

### 1. Offline-First Synchronization (Frontend)
The frontend uses **Dexie.js** (IndexedDB) as the local source of truth so the app works offline. 
- **Repositories:** UI components only mutate data through the Repository layer (`src/db/repository.ts`). 
- **Idempotency (`client_uuid`):** When creating/updating, a `client_uuid` (UUIDv4) is generated locally. The record is written to Dexie with `_dirty: 1`.
- **Sync Queue:** If offline, the mutation is pushed to the `sync_queue` table in Dexie. 
- **SyncEngine:** Listens for `online` events, replays the `sync_queue` to the Laravel API sequentially. 
- **Backend Idempotency:** The Laravel backend (`firstOrCreate` using `client_uuid`) guarantees that replaying the sync queue does not create duplicate records.

### 2. Frontend Conventions
- **TypeScript:** Strict mode is enforced. Avoid `any`; use `unknown` and type narrowing.
- **API Types:** Every API payload from Laravel must have a matching `interface` in `src/types/` using `snake_case` keys.
- **Ionic Lifecycle:** Use `useIonViewWillEnter` / `useIonViewDidEnter` to fetch data, not `useEffect`, so Ionic's page caching works optimally.
- **State Management:** Zustand is used for global state (`authStore`, `syncStore`).
- **UI & Layout:** Tailwind CSS is used for micro-layouts (margin, padding), while Ionic components (`IonPage`, `IonHeader`, `IonContent`) are used for the core native wrapper. Target viewport is 360px–430px.

### 3. Backend Conventions (Laravel 12+)
- **Stateless API:** All protected routes use `auth:sanctum`. Tokens are passed via `Authorization: Bearer <token>`.
- **API Resources:** Never return raw Eloquent models from controllers. Always wrap responses in an API Resource (`app/Http/Resources/`) to ensure JSON keys are `snake_case`.
- **Validation:** All validation must live in Form Requests (`app/Http/Requests/`), not inline in controllers.
- **N+1 Prevention:** Any list endpoint that fetches relationships must use Eager Loading (`with()`).
- **Routing:** All routes are defined in `routes/api.php` under the `/api` prefix.

### 4. Code Generation Triggers / Keywords
The project defines specific keywords for scaffolding code. If the user uses these triggers, follow the conventions:
- `@gen-api [FeatureName]` -> Create Migration, Model, Form Request, Controller, API Resource, add route to `api.php`, and create a feature test.
- `@gen-page [PageName]` -> Create a new Ionic React page using specifications in `.kiro/steering/design-system.md` and `skill/desain.md`.
- `@check-sync` -> Validate that the IndexedDB schema (React) matches the MariaDB table schema (Laravel).

### 5. Language & Context
- The application interface and database tables use Indonesian terminology (e.g., `lahan` for farm bed/plot, `semai` for seeding, `kas_keluar` for expenses).
- Stick to Indonesian naming for models, database columns, and UI text to match the existing codebase.