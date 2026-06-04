# Index Codebase

Perform a structured exploration of this codebase and generate a persistent memory file at
`.claude/codebase-memory.md`. This memory will be referenced in future sessions to avoid
re-reading the entire codebase from scratch.

---

## Step 1 — Orient

Start with the highest-signal files at the repo root. Read whatever exists:

- **Docs**: `README.md`, `README`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `DESIGN.md`
- **Manifests**: `go.mod`, `package.json`, `Cargo.toml`, `pyproject.toml`, `requirements.txt`,
  `Gemfile`, `pom.xml`, `build.gradle`, `composer.json`
- **Build/tasks**: `Makefile`, `Taskfile`, `justfile`, `scripts/`, `bin/`
- **CI**: `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `.circleci/`
- **Infra**: `Dockerfile`, `docker-compose.yml`, `k8s/`, `helm/`, `terraform/`, `pulumi/`

From these, determine: language(s), runtime, build system, major dependencies, deployment target.

---

## Step 2 — Map the Directory Tree

List the top two levels of the directory structure. For each non-trivial directory, infer its
purpose. Ignore: `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `.cache/`,
`*.lock`.

---

## Step 3 — Find Entry Points

Locate where execution begins. Look for:

- `main.*`, `index.*`, `app.*`, `server.*`, `cmd/`
- Framework roots: `src/`, `lib/`, `app/`, `pkg/`, `internal/`, `api/`, `web/`, `handler/`
- Test roots: `*_test.*`, `tests/`, `spec/`, `__tests__/`, `test/`
- Bootstrap scripts that wire the application together

Read entry point(s) fully. For files over 300 lines, read the first 80 lines plus any
init/setup/routing sections.

---

## Step 4 — Identify the Architecture Style

Based on structure and entry points, classify the architecture:

| Style | Signals |
|---|---|
| **Monolith** | Single binary/process, layered or MVC structure |
| **Modular monolith** | Single repo, strong internal module boundaries |
| **Microservices** | Multiple services each with own entry point and deploy |
| **Library / SDK** | No server, exposes a public API surface |
| **CLI tool** | Command-driven, subcommand structure |
| **Serverless** | Handler-per-function, no persistent process |
| **Frontend SPA/SSR** | Component tree, routing, client-side state |
| **Monorepo** | Multiple apps/packages under one repo root |

For each service or major module, read its entry point and skim its core files.

---

## Step 5 — Extract Key Patterns

Identify patterns that are **actually present** in this codebase. Skip any that don't apply.

| Category | What to look for |
|---|---|
| **Configuration** | Env vars, config files, feature flags, secrets manager |
| **Error handling** | Wrapped errors, custom error types, panic/recover, Result types |
| **Auth** | Middleware, JWT, sessions, API keys, OAuth, RBAC |
| **Data layer** | ORM vs raw SQL, DB driver, migration tool, cache layer |
| **Comms** | REST, gRPC, GraphQL, message queues, event bus, webhooks |
| **Observability** | Logging library + format, tracing, metrics, alerting |
| **Testing** | Unit/integration/e2e split, mocking strategy, test helpers |
| **Code generation** | Protobuf, OpenAPI, sqlc, codegen scripts |
| **Dependency injection** | Manual wiring, DI container, provider/wire pattern |

---

## Step 6 — Capture Gotchas & Non-Obvious Details

While reading, note anything that would surprise a new engineer:

- Non-standard conventions or naming that differ from language defaults
- Critical env vars that must be set to run the project
- External systems assumed to be running (databases, queues, third-party APIs)
- Known tech debt (`// TODO`, `// HACK`, `// FIXME`, `# NOTE`, `# WORKAROUND`)
- Files that must never be edited directly (generated, vendored, etc.)
- Anything confusing or counterintuitive encountered during this exploration

---

## Step 7 — Write `.claude/codebase-memory.md`

Create `.claude/` at the repo root if it doesn't exist. Write the memory file using this
structure — omit any section that genuinely doesn't apply:

```markdown
# Codebase Memory
_Indexed: <today's date> — regenerate with `/project:index-codebase` if stale_

## Project Overview
3–5 sentences: what this project does, who uses it, and the core tech stack.

## Language & Runtime
Primary language(s), runtime version, build tool.

## Directory Structure
Top-level directories with a one-line purpose for each meaningful one.

## Architecture
Style (monolith / microservices / CLI / library / etc.), key components, and how they relate.

## Entry Points
Where execution starts. Key files a new session should read first.

## Services / Modules
Per-service or per-module breakdown:
- **Name**: responsibility, key files, external dependencies

## Key Patterns
Only patterns present in this codebase:
- **Config**: how configuration is loaded
- **Error handling**: approach and conventions
- **Auth**: mechanism and where it lives
- **Data layer**: storage, ORM/driver, migrations
- **Comms**: inter-service or external communication style
- **Observability**: logging, tracing, metrics libraries
- **Testing**: structure and conventions

## External Systems
Services, APIs, databases, or queues this project depends on at runtime.

## Critical Environment Variables
Variables required to run or build the project locally.

## Gotchas & Non-Obvious Details
Anything that would surprise a new engineer or caused confusion during indexing.

## What Would Make This Memory Stale
Describe changes that should trigger a re-index (e.g. new service added, major refactor,
dependency upgrade, schema change).
```

---

## Step 8 — Confirm

After writing the file, reply with:

1. A one-paragraph summary of what was indexed
2. The architecture style identified
3. Count of services/modules documented
4. Any areas that were unclear or skipped due to insufficient signal
5. Reminder: re-run `/project:index-codebase` after major structural changes