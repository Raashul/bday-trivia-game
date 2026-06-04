# Birthday Trivia Party

A real-time multiplayer trivia game designed for parties. The host controls the pace from one screen while players join and answer on their own devices — no app install needed.

## How it works

1. The host logs in at `/` with a password and creates a game room
2. A 3-letter code is displayed — players go to `/game/<CODE>` on their phones and enter their name
3. The host starts the game, and questions appear on everyone's screen simultaneously
4. Players pick an answer and tap **Confirm**; the host sees how many have submitted
5. Host clicks **Lock Answers**, then **Show Answer** to reveal the correct option and update the leaderboard
6. Repeat until all questions are done — final results show rankings (and the bottom 3)

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **Socket.IO 4** for real-time events
- **PostgreSQL** via postgres.js for questions and score persistence
- **Tailwind CSS 4** + **Framer Motion** for UI
- Single Node.js process serves both the Next.js app and the Socket.IO server (`server.ts`)

## Setup

### 1. Database

Create a Postgres database and run the schema:

```bash
psql $DATABASE_URL -f db/schema.sql
```

> **Note:** Also create the `games` table manually — it's referenced in the app but currently missing from `schema.sql`:
> ```sql
> CREATE TABLE IF NOT EXISTS games (
>   code        text primary key,
>   status      text not null default 'active',
>   created_at  timestamptz not null default now(),
>   finished_at timestamptz
> );
> ```

### 2. Environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```
ADMIN_PASSWORD=your-secret-password
DATABASE_URL=postgres://user:pass@localhost:5432/trivia
PORT=3000
```

### 3. Install & run

```bash
npm install
npm run dev     # development
npm run build && npm start  # production
```

## Adding questions

Use the REST API (requires your admin password in the header):

```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -H "x-admin-password: your-secret-password" \
  -d '{
    "prompt": "What year was the birthday person born?",
    "options": ["1994", "1995", "1996", "1997"],
    "answer": 1,
    "category": "About the Birthday Person"
  }'
```

- `options` — array of 2–4 strings
- `answer` — 0-based index of the correct option
- `category` — optional label shown on the question card

## Scoring

Each correct answer is worth **1000 points**. No time bonus. The host controls the pace manually, so there's no countdown timer.

## Notes

- Only one game can be active at a time. Starting a new game ends the previous one.
- Game state (current question, submissions, player list) is in-memory — a server restart mid-game will lose live state. Questions and historical scores are persisted in Postgres.
- Players store their ID in `localStorage` and rejoin automatically on page refresh.
