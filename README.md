# Section AI - Frontend

The official modern web frontend for **Section AI**, an authoritative Pakistani legal intelligence and courtroom drafting platform.

## Features
- **Jurist (Legal Research Specialist):** Case law retrieval, ratio decidendi analysis, statutory cross-referencing, and precedent treatment.
- **Counsel (Courtroom Litigation Specialist):** Automated courtroom drafting for 6 Pakistani court pleading templates (Pre-Arrest Bail u/s 498 CrPC, Post-Arrest Bail u/s 497 CrPC, Writ Petition under Art. 199, Application u/s 12(2) CPC, Temporary Injunction under Order XXXIX Rules 1 & 2 CPC, Legal Notice).
- **Split-Screen Interactive Drafting Workspace:** Seamless hand-off from legal analysis to courtroom pleading canvas.
- **Full Backend Integration:** Real-time communication with the FastAPI backend (`https://lawyer-backend-production-3b52.up.railway.app`).

## Tech Stack
- **Framework:** TanStack Start (Nitro SSR)
- **UI & Styling:** React 19, Tailwind CSS v4, Radix UI primitives, Lucide Icons, Framer Motion
- **Auth:** Clerk
- **Database / Storage Client:** Supabase client

## Running Locally

```bash
npm install
npm run dev
```

## Production Build

```bash
# Build for Node.js server
NITRO_PRESET=node-server npm run build
node .output/server/index.mjs

# Or build for Cloudflare / Vercel
npm run build
```
