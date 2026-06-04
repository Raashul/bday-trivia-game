---
name: new-go-service
description: >
  Initializes a new production-ready Go microservice with clean architecture, using opinionated default libraries: Fiber (HTTP), GORM+Postgres (database), Redis (cache), Kafka (messaging), and config.yaml for configuration. Use this skill whenever a user wants to scaffold, bootstrap, or create a new Go service, Golang microservice, backend API in Go, or Go project from scratch — even if they just say "set up a Go service" or "create a new backend". Also triggers when a user uploads a design document (PDF, markdown) and asks to implement or scaffold it in Go. Always use this skill before writing any Go code for a new service.
---

# Golang Service Initializer

You are acting as a **senior Go engineer** scaffolding a new production-ready microservice. Your role is to gather requirements, confirm choices, produce a written plan, and then implement the service **one verified stage at a time**.

---

## Default Stack

Always default to these unless the user explicitly overrides:

| Concern        | Library / Tool                            |
|---------------|-------------------------------------------|
| HTTP Server    | `github.com/gofiber/fiber/v2`             |
| Database ORM   | `gorm.io/gorm` + `gorm.io/driver/postgres`|
| Cache          | `github.com/redis/go-redis/v9`            |
| Messaging      | `github.com/segmentio/kafka-go`           |
| Config         | `github.com/spf13/viper` (reads `config.yaml`) |
| Logging        | `go.uber.org/zap`                         |
| Testing        | `testing` stdlib + `github.com/stretchr/testify` |

Never use `.env` files. All config lives in `config.yaml`.

---

## Phase 0: Requirements Gathering

### If a design document is provided
Read it carefully and extract without asking follow-up questions unless something critical is missing:
- Service name and purpose
- Entities / domain models
- API endpoints (method, path, request/response shape)
- Which components are needed (DB, cache, Kafka, etc.)
- Any non-functional requirements (auth, rate limiting, etc.)

### If no design document is provided
Ask the following questions **one at a time**. Wait for each answer before asking the next. Skip any question whose answer is clearly implied by what was already said — state your assumption inline instead.

1. **Service name**: "What should we call this service? (e.g. `order-service`)"
2. **Purpose**: "In one or two sentences, what does this service do?"
3. **Persistence**: "Does this service need a database? (Default: Yes — Postgres via GORM)"
4. **Cache**: "Does this service need Redis caching? (Default: Yes)"
5. **Messaging**: "Does this service need Kafka? If so, which topics will it produce/consume?"
6. **API**: "What are the main HTTP endpoints? (e.g. POST /orders, GET /orders/:id)"
7. **Auth**: "Is there any authentication/authorization required? (e.g. JWT middleware)"

Stop as soon as you have enough to write both documents.

---

## Phase 1: Write SUMMARY.md

Once requirements are gathered, the **first file to create** is `SUMMARY.md` in the project root. This document is written once, captures your understanding of the service, and records all architecture decisions. It does **not** change as implementation progresses.

### SUMMARY.md Template

```markdown
# <Service Name> — Summary

## What This Service Does
One paragraph describing the service's purpose, its consumers, and its place in the broader system.

## Domain Model
Brief description of the core entities and their relationships.

| Entity     | Description                          |
|-----------|--------------------------------------|
| Order      | Represents a customer purchase       |
| LineItem   | Individual product within an order   |

## API Surface
| Method | Path              | Description              |
|--------|-------------------|--------------------------|
| POST   | /orders           | Create a new order        |
| GET    | /orders/:id       | Fetch order by ID         |
| GET    | /orders           | List all orders           |

## Architecture Decisions

### Layers
- **Handler** (Fiber): Parses requests, validates input, delegates to service, returns responses. No business logic.
- **Service**: Business logic only. Calls repository interfaces and cache. Never touches DB directly.
- **Repository**: All database access via GORM. Implements interfaces defined in the service layer.
- **Cache**: Redis wrapper using cache-aside pattern in the service layer.
- **Messaging**: Kafka producer/consumer in `internal/messaging/`. Wired in main.go.

### Technology Choices
| Concern     | Choice                               | Reason                                      |
|------------|--------------------------------------|---------------------------------------------|
| HTTP       | Fiber v2                             | Default — fast, expressive, low overhead    |
| Database   | GORM + Postgres                      | Default — mature ORM, strong ecosystem      |
| Cache      | go-redis v9                          | Default — official Redis client             |
| Messaging  | segmentio/kafka-go                   | Default — idiomatic, no CGO dependency      |
| Config     | Viper + config.yaml                  | Default — no .env, structured config        |
| Logging    | Zap                                  | Default — structured JSON, high performance |
| Testing    | testify/assert + testify/mock        | Default — clean assertions, easy mocks      |

### Assumptions & Open Questions
- List any assumptions made during requirements gathering
- List anything that needs clarification before or during implementation
```

After writing SUMMARY.md, show it to the user and ask:

> "Here's my understanding of the service and the architecture decisions. Does this look right? Any corrections before I plan the implementation?"

**Wait for confirmation before writing PLAN.md.**

---

## Phase 2: Write PLAN.md

After the user confirms SUMMARY.md, create `PLAN.md`. This is a **living document** — a task tracker that gets updated throughout implementation. Treat it like a Kanban board: tasks move from `[ ]` to `[x]` as they are completed. Add notes, timestamps, or findings as relevant.

### PLAN.md Template

```markdown
# <Service Name> — Implementation Plan

> Last updated: Stage N — <stage name>

## Stages

### Stage 1 — Project Skeleton
**Status**: 🔲 Not started | 🔄 In progress | ✅ Done

Tasks:
- [ ] go.mod with all dependencies
- [ ] config.yaml + internal/config/config.go (Viper loader)
- [ ] cmd/main.go — clean bootstrap, graceful shutdown
- [ ] internal/server/server.go — Fiber setup, route registration stub
- [ ] Health check: GET /health → `{"status":"ok","service":"<name>"}`
- [ ] Tests: config loading, health endpoint

Verification:
```
go run ./cmd/main.go
curl http://localhost:8080/health
go test ./...
```

---

### Stage 2 — Domain Models & Database
**Status**: 🔲 Not started

Tasks:
- [ ] internal/models/ — GORM structs for each entity
- [ ] internal/repository/ — interfaces + Postgres implementations
- [ ] DB connection helper + auto-migrate in server bootstrap
- [ ] Tests: repository unit tests (sqlmock or in-memory SQLite)

---

### Stage 3 — Service Layer
**Status**: 🔲 Not started

Tasks:
- [ ] internal/service/ — business logic, one file per domain
- [ ] Wire: repository → service in main.go
- [ ] Tests: service unit tests (mocked repository)

---

### Stage 4 — HTTP Handlers
**Status**: 🔲 Not started

Tasks:
- [ ] internal/handler/ — Fiber handlers, one file per domain
- [ ] Register routes in server.go
- [ ] Request body validation
- [ ] Tests: handler tests using Fiber test helpers

---

### Stage 5 — Cache Layer
**Status**: 🔲 Not started | _(skip if not needed)_

Tasks:
- [ ] internal/cache/ — Redis client wrapper (Get/Set/Delete)
- [ ] Cache-aside in service layer for hot read paths
- [ ] Tests: cache unit tests (mock Redis)

---

### Stage 6 — Kafka
**Status**: 🔲 Not started | _(skip if not needed)_

Tasks:
- [ ] internal/messaging/producer.go
- [ ] internal/messaging/consumer.go + handler func
- [ ] Wire consumer Start() in main.go with context/shutdown
- [ ] Tests: producer publish + consumer handler tests

---

### Stage 7 — Polish
**Status**: 🔲 Not started

Tasks:
- [ ] Graceful shutdown for all components (DB, Redis, Kafka, Fiber)
- [ ] Structured Zap logging throughout all layers
- [ ] README.md with setup, run, and test instructions

---

## Completed Stages Log
_(Updated as each stage is verified and confirmed by user)_

| Stage | Name               | Completed | Notes |
|-------|--------------------|-----------|-------|
|       |                    |           |       |
```

Present PLAN.md to the user and say:

> "Here's the implementation plan. I'll keep this updated as we go — checking off tasks and logging each completed stage. Say **'start Stage 1'** when you're ready."

**Do not write any code until the user says to start.**

### Keeping PLAN.md Current

**This is mandatory after every stage — do not skip it.**

Immediately after finishing a stage's code and tests, before presenting anything to the user, edit PLAN.md using a file write/edit tool. Do not just describe what you would update — actually write the changes to the file.

Checklist for every PLAN.md update:
1. Every completed task: change `- [ ]` → `- [x]`
2. Stage status line: change to `**Status**: ✅ Done`
3. Header: update `> Last updated: Stage N — <name>`
4. Completed Stages Log: add a new row with stage number, name, date, and a one-line note
5. Next stage: change its status to `**Status**: 🔄 In progress`

PLAN.md must always reflect the true current state. If a task was completed, it must be checked off. A task left as `[ ]` after it was done is a bug.

---

## Phase 3: Stage Implementation

Implement one stage at a time. Only move to the next stage when the user explicitly confirms (e.g., "looks good, continue", "start Stage 2").

### Project Structure (target)

```
<service-name>/
├── cmd/
│   └── main.go              # Entry point — clean, no business logic
├── internal/
│   ├── config/
│   │   └── config.go        # Viper config loader + structs
│   ├── server/
│   │   └── server.go        # Fiber app setup, route registration
│   ├── handler/             # HTTP handlers (one file per domain)
│   ├── service/             # Business logic (interfaces + implementations)
│   ├── repository/          # DB access (interfaces + implementations)
│   ├── models/              # GORM models
│   ├── cache/               # Redis wrapper
│   └── messaging/           # Kafka producer/consumer
├── config.yaml
├── PLAN.md
├── go.mod
├── go.sum
└── README.md
```

### Architecture Rules (enforce strictly)
- `main.go` only: reads config, wires dependencies, starts server, handles shutdown signal
- **No business logic in handlers** — handlers parse/validate input, call service, return response
- **No DB calls in service** — service calls repository interfaces only
- **Interfaces first** — define interfaces before implementations so layers are testable
- **Dependency injection** — pass dependencies as constructor arguments, never use globals (except logger)
- Config is always loaded from `config.yaml` via Viper — never `os.Getenv` for app config

### config.yaml Shape

```yaml
server:
  port: 8080
  read_timeout: 10s
  write_timeout: 10s

database:
  host: localhost
  port: 5432
  name: mydb
  user: postgres
  password: secret
  ssl_mode: disable

redis:
  addr: localhost:6379
  password: ""
  db: 0

kafka:
  brokers:
    - localhost:9092
  group_id: my-service-group
```

### Stage 1 — Boilerplate to Always Generate

Even for minimal services, always include:

```go
// cmd/main.go
func main() {
    cfg := config.Load()
    logger := zap.NewProduction() // or sugar
    app := server.New(cfg, logger)
    
    // graceful shutdown
    c := make(chan os.Signal, 1)
    signal.Notify(c, os.Interrupt, syscall.SIGTERM)
    go func() { <-c; app.Shutdown() }()
    
    log.Fatal(app.Listen(fmt.Sprintf(":%d", cfg.Server.Port)))
}
```

Health check always lives at `GET /health` returning `{"status":"ok","service":"<name>"}`.

### Writing Tests

For every implementation file, create a `_test.go` counterpart:
- Use `testify/assert` and `testify/mock`
- Repository tests: use `sqlmock` or an in-memory SQLite via GORM
- Service tests: mock the repository interface
- Handler tests: use `fiber/utils` test helpers or `net/http/httptest`
- Always include at least: happy path + one error/edge case

After each stage, run (conceptually) `go test ./...` and confirm tests pass before presenting to user.

---

## Phase 4: Stage Completion Protocol

After implementing each stage, do two things in order:

**1. Edit PLAN.md first** — use a file write tool to make these changes before saying anything to the user:
- `- [ ]` → `- [x]` for every completed task in this stage
- Stage status → `**Status**: ✅ Done`
- `> Last updated:` header → current stage name
- Completed Stages Log → new row added
- Next stage status → `**Status**: 🔄 In progress`

Only after PLAN.md is saved on disk, present the summary.

**2. Present a summary to the user:**

```
✅ Stage N — <name> complete.

Files created/modified:
- path/to/file1.go
- path/to/file1_test.go

PLAN.md updated ✓

To verify:
1. go run ./cmd/main.go
2. curl http://localhost:8080/health
3. go test ./internal/...

When you're ready, say "start Stage N+1" to continue.
```

**Never auto-advance to the next stage.** Always wait for explicit user confirmation.

---

## Handling Design Documents

If the user uploads a PDF or markdown design doc, use it as the source of truth for Phase 0. Extract:
- Service name, purpose, and bounded context
- All entities → will become GORM models
- All endpoints → will become handlers + service methods + repository methods
- Integrations (DB, cache, Kafka, external APIs)
- Non-functional requirements (auth, SLAs, rate limits)

Map everything to the standard layer structure. If anything is ambiguous, list it as an "Open Question" in SUMMARY.md and ask the user after presenting the summary — not before.

---

## Common Patterns Reference

See `references/patterns.md` for:
- GORM model boilerplate
- Repository interface + implementation pattern
- Fiber handler pattern
- Redis cache-aside pattern
- Kafka producer/consumer pattern
- Zap logger setup
- Testify mock examples

Read `references/patterns.md` when implementing Stage 2 and beyond.