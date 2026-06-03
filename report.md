# Design Review Report

**Document Reviewed:** Birthday Trivia Party — Design Document (`doc.mdx`)
**Review Date:** 2026-06-01
**Complexity Rating:** 🔴 High
**Reviewer Persona:** Senior Staff Engineer / Architect

---

## Executive Summary

The core architecture — Socket.IO on a persistent Node.js custom server, an in-memory authoritative game engine, and Postgres for player/answer persistence — is sound for the stated scale (8–10 players, self-hosted). The grilling session produced significant and healthy simplifications: flat scoring, no crash recovery, no MDX, and a plain Lock button with no timer. The revised design is leaner and more buildable than what was in the doc. I'd approve it with the conditions noted below.

**Verdict:** ⚠️ Approved with Conditions

---

## Strengths

- Server-authoritative design is correct — clients never decide correctness or scores, so there's no meaningful cheating surface.
- Socket.IO's auto-reconnect is the right call for a party where phones sleep constantly.
- Render as the deployment target is a good fit — persistent process, simple deploys, no serverless footguns.
- The state machine (LOBBY → QUESTION_ACTIVE → LOCKED → REVEALED → FINISHED) is clean and well-defined.
- The decision to restore submitted state on rejoin via a DB query is correct and eliminates a whole class of resubmission bugs.
- Simplifying to flat scoring (1000/0) removes the speed-bonus complexity without hurting the game experience.

---

## Issues Identified

### 🔴 Critical (must fix before proceeding)

- **Vercel is incompatible with this architecture.** Custom servers and Socket.IO do not work on Vercel. **Resolved during review — deploy to Render.**

### 🟡 Medium (should address before launch)

- **Unauthenticated question endpoint is open to anyone.** The POST endpoint for adding questions has no auth. While the agreed workflow is "add questions before the party," any guest who discovers the URL (e.g. from browser devtools on the host's machine) can add questions between Play Again rounds. Add the admin password as a required header or query param — one `if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD)` check is enough.
- **Schema has dead weight from dropped features.** The `game_state` table (crash recovery) and the `elapsed_ms` column in `responses` (speed bonus) are no longer needed. Ship the simplified schema or you'll carry confusion forever.
- **Tie-break logic in Section 9 references `elapsed_ms`** which is now meaningless for scoring. The tie-break should be simplified to: total points → correct count → arbitrary (e.g. join order). Update `lib/scoring.ts` to reflect this.

### 🟢 Low (nice to have / future considerations)

- **No rate limiting on `admin:auth` socket event.** Low risk given the password is party-private, but a trivial 5-attempts-per-minute lockout would close the window entirely.
- **Admin password stored in `localStorage` as plaintext.** Acceptable for a party app, but worth a README note so the host knows to clear it on a shared device after the party.
- **`submittedIds` leaking to admin only** requires per-socket targeted emits rather than a broadcast. Make sure this is implemented as `socket.emit(...)` to the admin socket directly, not accidentally broadcast to all.

---

## Q&A Summary

| # | Question | Answer Summary | Status |
|---|----------|---------------|--------|
| 1 | What happens to `elapsed_ms` scoring on server restart mid-question? | No speed bonus at all — flat 1000/0 scoring. No crash recovery needed. | ✅ Resolved |
| 2 | Does Socket.IO + custom server work on the intended deployment target? | Vercel was the original plan — incompatible. Switched to Render. | ✅ Resolved |
| 3 | Admin reconnect mechanism: localStorage or signed cookie? Rate limiting? | Password stored in localStorage, replayed on reconnect. No rate limiting. | ✅ Resolved |
| 4 | Submission denominator: connected sockets or all registered players? | Currently connected sockets. Small party (8–10). Disconnected players can rejoin and submit. | ✅ Resolved |
| 5 | MDX build-time vs runtime loading — how does the optional editor hot-reload? | MDX dropped entirely. Questions stored in DB, managed via unauthenticated REST API. | ✅ Resolved |
| 6 | 30-second admin timer: client-side or server-tracked? | Timer dropped entirely. Admin has a plain Lock button, no countdown. | ✅ Resolved |
| 7 | How is already-submitted state restored on player rejoin? | Query DB for existing `(playerId, currentQuestionId)` response on rejoin. Restore to waiting state if found. | ✅ Resolved |
| 8 | What happens when a question is added via curl mid-game? | Not a use case. Questions are added only before the party starts. | ✅ Resolved |

---

## TBD / Unresolved Items

None — all questions were addressed during the review session.

---

## Decisions Confirmed

- **Render** as deployment target (persistent Node.js process, Socket.IO compatible).
- **Socket.IO + custom `server.ts`** bootstrapping Next.js App Router — valid on Render.
- **In-memory game engine** as the single authoritative state machine.
- **Flat scoring:** correct answer = 1000 pts, wrong = 0. No speed bonus.
- **No crash recovery.** `game_state` table dropped. If the server restarts, the game is over.
- **No per-question timer.** Admin has a single Lock button; they decide when to close answers.
- **Admin auth:** socket event → password validated against env var → password stored in `localStorage` for reconnect.
- **Questions in DB** via a simple REST POST endpoint, set up before the party. MDX approach dropped.
- **Reconnect state:** server queries `responses` on `player:rejoin` to restore submitted state.
- **Submission denominator:** currently connected sockets (appropriate for 8–10 player scale).

---

## Open Questions / Action Items

- [ ] Add admin password check to the question POST endpoint (one-line header validation).
- [ ] Drop `game_state` table and `elapsed_ms` column from `db/schema.sql`.
- [ ] Update `lib/scoring.ts` to remove speed bonus constants and simplify tie-break logic.
- [ ] Update `lib/events.ts` to remove `elapsed_ms` from response payload types.
- [ ] Confirm `game:submissionUpdate` with `submittedIds` is a targeted `socket.emit` to admin only, not a broadcast.
- [ ] Add a README note that the question endpoint should only be called before the game starts.

---

## Recommendation

The design is ready to build against — start from the simplified schema and work through the Build Order in Section 15, skipping steps 9 (crash recovery) and 11 (MDX editor). Address the three medium issues (unauthenticated endpoint, dead schema columns, tie-break logic) before the party, not after — they're each a 10-minute fix that will cause real confusion if left in.
