# Codebase Memory
_Indexed: 2026-06-03 — regenerate with `/project:index-codebase` if stale_

## Project Overview
Birthday Trivia Party is a real-time multiplayer trivia game built for a party setting. A host creates a game room (3-letter code), players join on their phones, and the host drives the flow question-by-question via Socket.IO. The app is a Next.js 16 SSR frontend combined with a custom Node.js HTTP + Socket.IO server, backed by PostgreSQL.

## Language & Runtime
- **Language**: TypeScript 5 (strict mode implied)
- **Runtime**: Node.js via `tsx` (no transpile step needed for dev or prod)
- **Build**: `next build` for the Next.js bundle; `tsx server.ts` as the process entry for both dev and prod

## Directory Structure
```
trivia-party/
├── server.ts            # Entry point — boots Next.js + Socket.IO on same HTTP server
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── page.tsx     # "/" — admin login + create game (host control panel)
│   │   ├── layout.tsx   # Root layout (Geist font, dark bg)
│   │   ├── globals.css  # Tailwind global styles
│   │   └── game/[code]/ # "/game/ABC" — player+admin game view (single unified page)
│   │       └── page.tsx
│   ├── app/api/questions/route.ts  # REST endpoint: POST/GET questions (admin only)
│   ├── lib/
│   │   ├── db.ts         # postgres.js database client + all queries
│   │   ├── events.ts     # Shared Socket.IO event types (server ↔ client contract)
│   │   ├── gameEngine.ts # All Socket.IO server-side logic + in-memory game state
│   │   ├── scoring.ts    # Points constants (POINTS_CORRECT=1000, POINTS_WRONG=0)
│   │   └── socketClient.ts  # Singleton socket.io-client for browser use
│   └── components/      # Subdirectories (game/, lobby/, leaderboard/, results/) exist but are EMPTY
├── db/
│   └── schema.sql       # DDL for questions, players, responses (see Gotchas — games table missing)
├── public/              # Static SVG assets (default Next.js placeholders)
└── .env.example         # ADMIN_PASSWORD, DATABASE_URL, PORT
```

## Architecture
**Monolith (SSR + WebSocket)**. A single Node.js process serves both the Next.js app (HTTP) and Socket.IO. The game state is held **entirely in memory** inside `setupSocketHandlers` in `gameEngine.ts` — there is only one active game at a time. The PostgreSQL database is used for persistence of questions, players, and responses (scores), but the live game state (current phase, submissions, player roster) lives only in-process.

## Entry Points
1. **`server.ts`** — imports `next`, creates an HTTP server, attaches Socket.IO, then calls `setupSocketHandlers`. Critical: `gameEngine.ts` is dynamically imported *after* `app.prepare()` so that `.env.local` is loaded before `db.ts` initializes the postgres connection.
2. **`src/app/page.tsx`** — admin-facing home page; password-gates host functions.
3. **`src/app/game/[code]/page.tsx`** — unified game page for both players and admin; role is determined dynamically from localStorage.

## Services / Modules

### gameEngine (`src/lib/gameEngine.ts`)
Single exported function `setupSocketHandlers(io)` that closes over a `GameState` object. Handles all Socket.IO events. Game phases: `LOBBY → QUESTION_ACTIVE → LOCKED → REVEALED → QUESTION_ACTIVE → … → FINISHED`.

Admin events: `admin:auth`, `admin:createGame`, `admin:killGame`, `admin:startGame`, `admin:lock`, `admin:reveal`, `admin:nextQuestion`, `admin:playAgain`

Player events: `player:join`, `player:rejoin`, `player:leave`, `player:submitAnswer`, `game:join`

### db (`src/lib/db.ts`)
postgres.js client (pool size 10, SSL). Methods: `createPlayer`, `createResponse`, `getLeaderboard`, `createGame`, `getGame`, `setGameStatus`, `deletePlayer`, `resetForNewGame`, `syncPlayers`, `addQuestion`, `getQuestions`. `resetForNewGame` does `TRUNCATE players CASCADE` (nukes players and responses together).

### events (`src/lib/events.ts`)
Shared type-only module. Defines `Phase`, all payload interfaces, `ServerToClientEvents`, `ClientToServerEvents`. Imported by both server (gameEngine) and client (page.tsx / socketClient.ts).

### scoring (`src/lib/scoring.ts`)
Trivial: `POINTS_CORRECT = 1000`, `POINTS_WRONG = 0`. No time-based bonus implemented.

### socketClient (`src/lib/socketClient.ts`)
Browser-only singleton (`'use client'`). Lazily creates one `socket.io-client` instance at path `/socket.io`. Shared across pages via module-level variable.

### API route (`src/app/api/questions/route.ts`)
Admin-only REST: `POST /api/questions` to add a question, `GET /api/questions` to list them. Auth via `x-admin-password` header checked against `process.env.ADMIN_PASSWORD`.

## Key Patterns

- **Config**: `.env.local` loaded by Next.js `app.prepare()`. Three vars: `ADMIN_PASSWORD`, `DATABASE_URL`, `PORT`. No config library — raw `process.env` access.
- **Auth**: Password-based. Admin authenticates via Socket.IO `admin:auth` event; server stores socket IDs in `state.adminSocketIds`. REST API uses `x-admin-password` header. No sessions, no JWT. Admin password is stored in `localStorage` for auto-reconnect.
- **Data layer**: postgres.js (not an ORM). Raw tagged-template SQL. No migration tool — schema is applied manually via `db/schema.sql`.
- **Comms**: Socket.IO v4 for all real-time game events. Next.js API routes for question CRUD (admin tooling only).
- **Testing**: None present.
- **Observability**: `console.log` only (`> Ready on http://localhost:PORT`). No structured logging, tracing, or metrics.
- **Dependency injection**: None — `db` is a module-level singleton, `state` is a closure in `setupSocketHandlers`.

## External Systems
- **PostgreSQL** — must be running and accessible at `DATABASE_URL`. Schema applied via `db/schema.sql`.

## Critical Environment Variables
| Variable | Description |
|---|---|
| `DATABASE_URL` | postgres connection string, e.g. `postgres://user:pass@localhost:5432/trivia` |
| `ADMIN_PASSWORD` | Password for host login (Socket.IO + REST API) |
| `PORT` | HTTP listen port (default `3000`) |

## Gotchas & Non-Obvious Details

1. **`games` table is missing from `schema.sql`** — `db.ts` calls `createGame`, `getGame`, `setGameStatus` which reference a `games` table (`code`, `status`, `finished_at` columns), but `db/schema.sql` only defines `questions`, `players`, `responses`. The `games` table must be created manually or the schema file is out of date.

2. **Single active game only** — `GameState` is a single in-process object. There is no multi-tenancy. `admin:createGame` kills any existing game before creating a new one.

3. **In-memory state is ephemeral** — if the server restarts mid-game, all live state (players in lobby, current question index, submissions) is lost. Only DB-persisted data (questions, historical responses) survives.

4. **`server.ts` import order is critical** — `gameEngine` (and therefore `db.ts`) must be imported *after* `app.prepare()` resolves, because `app.prepare()` is what loads `.env.local`. The dynamic `await import('./src/lib/gameEngine')` enforces this.

5. **Player ID stored in `localStorage`** — players get a nanoid on join, stored in `localStorage('playerId')`. `player:rejoin` uses this to reconnect after a page refresh. If localStorage is cleared, the player appears as a new join.

6. **Admin password also stored in localStorage** — `localStorage('adminPassword')` is used to auto-re-authenticate the admin on page load/refresh. Not a security concern for a party game but worth knowing.

7. **`src/components/` subdirectories are empty** — `game/`, `lobby/`, `leaderboard/`, `results/` directories exist but contain no files. All UI is inline in `src/app/game/[code]/page.tsx` (573 lines) and `src/app/page.tsx`.

8. **Game code avoids visually ambiguous characters** — `CODE_CHARS` excludes `I`, `O`, `L` to prevent confusion with `1`, `0`.

9. **No time-limit on answers** — admin manually clicks "Lock Answers" to stop submissions. No server-side timer.

10. **`TRUNCATE players CASCADE`** on game start — `resetForNewGame()` wipes all players and responses before a new game (or play-again). Players in the in-memory lobby are re-synced to the DB immediately after via `syncPlayers`.

## What Would Make This Memory Stale
- Adding the missing `games` table to `schema.sql`
- Extracting lobby/game/results into `src/components/` (currently empty)
- Adding multi-game support (state becomes per-room)
- Adding a timer/auto-lock mechanism
- Introducing a migration tool (drizzle, prisma, etc.)
- Adding authentication beyond the simple password check
