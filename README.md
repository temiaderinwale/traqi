# Traqi — Next.js application

Traqi, a modern design system, on **Next.js 14 (App Router) + TypeScript + Tailwind**, backed by the
**traqi-prod** Firebase project.

## Requirements
Node.js 18.17+ (Node 20 LTS recommended)

## Run it
```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Firebase setup (one time)
In the console for **traqi-prod**:
1. Authentication → Sign-in method → enable **Email/Password** and **Google**.
2. Authentication → Settings → Authorized domains → add `localhost` + your domain.
3. Firestore → create database, then apply:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /businesses/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Routes

| Route | Module |
|---|---|
| `/` | Public landing page (marketing) |
| `/auth` | Sign in / register / verify / reset / onboarding |
| `/dashboard` | Daily Briefing |
| `/products` · `/sales` · `/returns` | Sales modules |
| `/inventory` · `/suppliers` · `/expenses` · `/debts` · `/financials` | Finance & ops |
| `/customers` · `/followups` · `/templates` | Customer modules |
| `/team` · `/tasks` · `/approvals` · `/messages` · `/activity` | Management |

Owner-only and permission-gated routes redirect assistants back to the dashboard.

## Architecture

```
app/
  layout.tsx            next/font (Archivo + Inter), theme init, TraqiProvider
  page.tsx              public landing page
  auth/page.tsx         auth + onboarding
  (app)/layout.tsx      AppShell wrapper for every authenticated route
  (app)/*/page.tsx      one route per module
lib/
  firebase.ts           Firebase init (traqi-prod), workspace read/write, PIN bundles
  types.ts              typed domain model for every record
  compute.ts            permissions + computed logic (stats, inventory, follow-ups…)
  store.tsx             React context: auth stages, workspace state, Firestore sync
  format.ts             money, dates, ids, password strength, error messages
components/
  landing/*             landing page: nav, showcase tabs, FAQ, scroll reveal
  Brand.tsx             logo mark + wordmark shared by every surface
  AppShell.tsx          sidebar, topbar, mobile nav, role gate, session lock
  ui.tsx                cards, KPIs, tables, modals, charts, badges
  forms.tsx             all record forms
  SaleForm.tsx          multi-product sale builder + receipt
  ImportModal.tsx       CSV import
  SettingsModal.tsx     business info, PIN, theme, backup, danger zone
```

## Data model
One Firestore document per workspace: `businesses/{uid}` — profile fields plus
every collection. Each write also lands in `localStorage` with a `lastModified`
stamp; on load the newer copy wins, so the app survives offline and a stale
cloud copy can never overwrite fresh local data.

## Notes
- Light theme is the default; the toggle persists to `localStorage`.
- The role PIN is asked once per browser session (`sessionStorage`), and the
  session locks after 30 idle minutes.
- Keyboard: the FAB and "New Sale" open the sale builder from anywhere.
