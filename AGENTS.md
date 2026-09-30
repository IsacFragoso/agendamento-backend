# AGENTS.md — agendamento-backend

Rules for contributors and AI agents working in this repository. Run all commands from the repository root.


## Related repository

The frontend is a **separate repository**: `https://github.com/IsacFragoso/agendamento-frontend`. You may read relevant frontend files for context when a task involves frontend integration or an API contract, but first follow the frontend repository's `AGENTS.md` and `ARCHITECTURE.md`. Do not edit frontend files during backend work unless the user explicitly authorizes a cross-repository change. When a change alters an endpoint (path, request body, response shape, status codes), say so clearly in your summary and PR description so the frontend can be updated. Never assume the frontend will adapt on its own.

## Source of truth

1. Code and package manifests (`package.json`, lockfile, `tsconfig`) win over any prose.
2. The project used to have a Laravel backend; it is now NestJS. Any doc, comment or config that refers to Laravel, PHP, Artisan, Eloquent, Composer, "Actions"/"Resources"/"Requests" layers, or API "surfaces" is obsolete. Follow the code and mention the discrepancy in your summary.
3. See `ARCHITECTURE.md` for how the backend is structured.

## Stack

- Node.js + TypeScript, NestJS 10 with the Express adapter.
- REST/JSON under the `/api` global prefix.
- PostgreSQL via TypeORM + `pg`. Schema changes go through migrations only.
- Auth: Passport JWT bearer tokens, `bcryptjs` for password hashing.
- Validation: `class-validator` / `class-transformer` on DTOs.
- Tests: Jest (`ts-jest`) and Supertest.

## Commands

Verify against `package.json`; these are the expected names.

| Task | Command |
| --- | --- |
| Install | `npm install` |
| Dev server | `npm run start:dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Tests | `npm.cmd run test:api` |
| Generate migration | No generation script is configured; add and review a migration under `src/database/migrations/` manually |
| Run migrations | `npm.cmd run migration:run` |
| Revert last migration | `npm.cmd run migration:revert` |

Before finishing, run lint, build and the relevant tests.

## Local environment

The database is **PostgreSQL hosted on Neon** (there is no local PostgreSQL or Docker setup). Configuration comes from a `.env` file (copy `.env.example`; `.env` is git-ignored):

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | `development` locally |
| `PORT` | API port (`8000`; the API is served under `/api`) |
| `DB_HOST`, `DB_PORT` | Neon host and port (`5432`) |
| `DB_USER`, `DB_PASSWORD` | Database credentials |
| `DB_NAME` | Database name |
| `DB_SSL` | `true` (Neon requires SSL) |
| `JWT_SECRET` | Secret used to sign tokens; must be a long random value, never the example text |
| `JWT_EXPIRATION` | JWT lifetime in seconds (`3600` by default) |

- The team currently shares one Neon database for development. Treat it as shared data: never run migrations, seeds, resets, or destructive tests against it without explicit authorization.
- There is currently no dedicated test database configured. Unit tests should use mocks, and API tests must not silently connect to the shared Neon database. Create a separate Neon branch or database before adding tests that require real persistence.
- Never print, log or commit the values of `DB_PASSWORD` or `JWT_SECRET`.

## Conventions

- Follow the existing module layout: `controller` → `service` → `entity`, with DTOs for every request body and query. Use `src/modules/appointments/` as the reference module when adding a feature.
- In this project, an appointment (`agendamento`) is a booking that connects a client, provider, service, start/end time, and status. The `appointments` module also manages appointment reviews (`avaliacoes`).
- Every DTO field is validated with `class-validator`. Keep the global `ValidationPipe` settings as they are.
- Keep controllers thin; business rules live in services.
- Preserve existing route paths, request shapes and response shapes. Do not silently change the shape of a response existing consumers use; a breaking change needs an explicit note in the summary and PR description so the frontend repository can be updated.
- Routes are declared in controllers; controllers adapt HTTP and call services. A controller never calls another controller, and a service never receives the raw `Request`/`Response` object. Pass validated DTOs or domain objects.
- Use Nest dependency injection. Do not add an interface or a generic repository layer for a single implementation or trivial CRUD; TypeORM repositories/entities are enough until there is real complexity (locking, multiple sources, heavy reuse).
- Prefer guard clauses and short happy paths. Do not hide queries, transactions or external calls in unexpected side effects.

## Transactions and concurrency

- The service owns the transaction of a use case. Do not open independent transactions in helpers that are called from inside one.
- Do not hold a transaction open across network calls or slow work. Side effects (emails, notifications) happen after commit.
- Booking creation is the case that matters: two concurrent requests for the same slot must produce one success and one `409`. See "Booking domain invariants" below.

## Migrations

- Check the impact on existing data before writing a migration. Define indexes, constraints and foreign keys deliberately.
- Do not drop columns or data without a migration plan (stop reading, deploy, then drop).
- If a schema change affects an existing flow, update fixtures/factories and tests in the same change.
- Never run a destructive migration on any shared environment without explicit authorization.
- Never edit a migration that has already been applied or merged. Add a new one.
- Never enable `synchronize: true`.
- Every migration implements a working `down`.
- Prefer additive, backward-compatible changes (add nullable column, backfill, then tighten).
- Review generated migrations by hand before committing; remove unrelated diffs.

## Auth and token revocation

- Revocation is stored in **PostgreSQL**. Extend the existing revocation table and service when changing this behavior.
- `RedisService` exists but is intentionally **not registered or wired**. Revoked tokens are stored in PostgreSQL, so Redis is not part of the current authentication path. Do not import it, register it in a module, or add Redis as a dependency of any feature unless the task explicitly asks for it.
- Protect routes with `JwtAuthGuard` and, where required, `AdminGuard`; ownership and provider/client rules are enforced in the relevant service. Account roles are `CLIENTE`, `PRESTADOR`, and `ADMIN`.
- JWT lifetime is controlled by `JWT_EXPIRATION` in seconds, with a default of `3600`. Refresh tokens are not implemented.
- Never return password hashes from any endpoint.

## Input and errors

- Treat all input (body, query, params, headers) as untrusted. Frontend validation is for UX; backend validation is the real one.
- Return response DTOs, not raw entities, unless there is an explicit decision to expose the entity.
- Errors must be safe for the consumer: no stack traces or internal details in responses. Use Nest HTTP exceptions rather than ad-hoc responses. No custom exception filter is registered; Nest's default error shape is used, typically `{ statusCode, message, error }`, with `message` either a string or validation-error array.
- Do not swallow unexpected errors; log them with enough context and no sensitive data. Use distinct statuses for validation (`400`), unauthenticated (`401`), forbidden (`403`), not found (`404`), conflict (`409`) and internal failures.

### Authorization scope and queries

- Authorize the resource and the operation, not just the presence of a valid token.
- Apply the visibility scope in the service: clients see their own appointments, providers see appointments assigned to them, and administrators can see all appointments. Users may read or change their own account data; provider and service management is ownership-scoped, except for administrators.
- Any client-controlled filter, sort field or search column must go through a whitelist. Never build SQL identifiers from input; always use bound parameters.
- The current API has no general pagination or client-controlled sorting contract. Appointment lists are ordered by `data_hora_inicio`; provider search accepts whitelisted name, category, service, coordinates, and radius filters.

## Testing

- Behavioral changes need tests in the same change.
- Unit and API tests use Jest; service tests and Supertest API tests are under `test/`, organized by module. Cover failure paths (validation errors, unauthorized, conflict), not just the happy path.
- Changes to booking, auth or migrations must include a test for the invariant they touch.
- For any new or changed endpoint, cover: authentication and authorization (including access to another user's data), status code and error body, input validation, and the write use case itself. For booking, add a conflict case.
- Tests must not depend on the development database, the internet or real external services.
- If the HTTP contract changed, mention it in the summary (the frontend lives in another repository).

## Booking domain invariants

These are the bugs that cost the most. Do not weaken them.

- **Time zones:** User and provider lifecycle timestamps use `timestamptz`, but the current appointment migration/entity still uses PostgreSQL `timestamp` without time zone. The API accepts ISO date strings; a single UTC storage/display policy still needs to be decided before expanding booking automation.
- **No double booking:** the service performs an application-level overlap query and returns `409` when it finds a conflict. There is currently no database exclusion constraint, locking transaction, or equivalent final database guard.
- **Cancellation and rescheduling:** the provider or administrator can set an appointment status to `PENDENTE`, `CONFIRMADO`, `CANCELADO`, or `CONCLUIDO`. Transition restrictions, cancellation notice, and rescheduling rules are not currently defined in code.
- **Availability rules:** weekly provider intervals are stored in `horarios`; service duration comes from `duracao_padrao`. There is no blocked-period/holiday model, slot-generation endpoint, buffer policy, or database-enforced availability rule yet.

## Git and safety

- Never run `git commit`, `git push`, `git reset`, `git checkout`, branch switches or bulk deletions without explicit authorization in the current turn.
- Check the workspace state before editing and preserve changes you did not make.
- The development database is a hosted Neon database that may be shared with teammates. Never run migrations, seeds, resets or destructive scripts against it without explicit authorization in the current turn, and never against a production database.
- Never publish, deploy or change infrastructure.
- Never commit `.env` files or secrets. Never log tokens, passwords or PII.
- Commit message convention (if asked to write one): use focused prefixes such as `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, and `chore:`.

## Workflow

1. **Before editing:** find the file that *decides* the behavior (not just the one that forwards to it) and read one neighboring implementation of the same pattern. Do not explore the whole repo when one controller, service or test answers the question.
2. **Editing:** make the smallest change that solves the problem. Reuse existing helpers. Do not create abstractions to save a few lines. Comments explain *why*, never *what*.
3. **After editing:** run the narrowest check first, then lint, build and the wider suite as the impact warrants. If something fails, fix that same slice and re-run. Review your diff for accidental changes.
4. **Report:** what you changed, what you ran and the results, and anything you could not verify.

## Working style

- Keep changes focused. No drive-by refactors, formatting sweeps or dependency bumps.
- Do not add dependencies without a stated reason in the summary.
- Language: use English for code identifiers and commit messages; current user-facing API messages are primarily Brazilian Portuguese. Keep API field names consistent with the existing Portuguese names.
