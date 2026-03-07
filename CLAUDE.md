# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server on localhost:3000

# Build & production
npm run build
npm run start

# Linting
npm run lint

# Database
npm run db:push      # Push schema changes without migration (dev)
npm run db:migrate   # Create and run a migration
npm run db:seed      # Seed superadmin user + SiteSettings singleton
npm run db:studio    # Open Prisma Studio UI
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — base URL (e.g. `http://localhost:3000`)
- `YOUTUBE_API_KEY` — YouTube Data API v3 key

After setting up the DB, run `npm run db:push && npm run db:seed` to initialize schema and create the first superadmin.

Seed credentials default to `admin@example.com` / `changeme123` unless overridden via `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` env vars.

## Architecture

**QiGong Together** is a Next.js 16 / React 19 app that synchronizes YouTube playlist playback across all viewers on an hourly clock — everyone watching the same "channel" sees the same video at the same offset.

### Core sync mechanic (`src/lib/youtube.ts`)

`calcHourlySync(videos)` computes which video is playing and at what seek position by taking `(UTC minutes*60 + seconds) % totalPlaylistDuration`. The `HourlyPlayer` component uses the YouTube IFrame API to load and seek to that position. The player reloads at the top of each hour via a `setTimeout`.

### Data model (`prisma/schema.prisma`)

Three-role system: `SUPERADMIN` → `LEADER` → `MEMBER`.
- **User** — auth identity with bcrypt password, role
- **Group** — has one leader (User), a URL slug, optional `playlistUrl`
- **Membership** — join table (User ↔ Group), unique per pair
- **SiteSettings** — singleton row (id="singleton") storing `publicPlaylist` URL for the community broadcast

### API routes (`src/app/api/`)

| Route | Purpose |
|---|---|
| `GET/PATCH /api/admin/settings` | SUPERADMIN: read/set public playlist |
| `GET/POST /api/groups` | List groups (filtered by role) or create new group (LEADER+) |
| `GET/PATCH/DELETE /api/groups/[id]` | Group CRUD, role-checked |
| `GET /api/playlist?type=public\|group&groupId=` | Fetch YouTube playlist and return hourly sync position |
| `POST /api/register` | Create user; accepts optional `?group=<slug>` to auto-join |
| `[...nextauth]` | NextAuth credentials handler |

### Auth (`src/lib/auth.ts`)

NextAuth v5 with JWT strategy. The JWT and session callbacks extend the token/session with `id` and `role` from the database. Session is consumed server-side via `auth()` and client-side via `useSession()` (wrapped in `SessionProvider`).

### Pages

- `/` — Public HourlyPlayer fed by the community playlist
- `/dashboard` — Member's group list (server component, redirects if unauthenticated)
- `/group/[slug]` — Group-specific HourlyPlayer (checks membership/leader/superadmin)
- `/leader` — LEADER+ group management (create/edit groups, set playlist URL)
- `/admin` — SUPERADMIN dashboard (set public playlist, manage all groups)

### Styling

Tailwind CSS v4 with a dark `stone-950` base and `emerald-400` accent. No component library.

### Prisma client

Generated to `src/generated/prisma/` (non-default output). Uses `@prisma/adapter-pg` for the PostgreSQL driver. The singleton pattern in `src/lib/prisma.ts` avoids multiple connections in development hot-reload.
