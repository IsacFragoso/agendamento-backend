# Backend architecture

REST API for the appointment-booking system (school project). The frontend is a separate repository, `TODO: GitHub URL of agendamento-frontend`: a React 19 + Vite SPA that calls this API with `fetch` and a JWT in the `Authorization: Bearer` header.

```text
Browser (React SPA)  ──JSON over HTTP──▶  NestJS API (/api)  ──TypeORM──▶  PostgreSQL
```

**Stack:** Node.js, TypeScript, NestJS 10 (Express adapter), TypeORM + `pg`, PostgreSQL, Passport JWT, `bcryptjs`, `class-validator` / `class-transformer`, Jest + Supertest.

> Placeholders marked `TODO` need facts from the repo. Describe what the code does today; if the code and this file disagree, the code wins and this file should be fixed.

## 1. Folder structure

```text
agendamento-backend/
├── src/
│   ├── main.ts                 # bootstrap: global prefix /api, ValidationPipe
│   ├── app.module.ts           # root module, TypeORM connection
│   ├── TODO: auth/             # login, JWT strategy, guard, revocation
│   ├── TODO: users/
│   ├── TODO: appointments/     # reference module for new features
│   ├── TODO: common/           # shared guards, decorators, filters, if any
│   └── migrations/             # TypeORM migrations
├── test/                       # Supertest e2e tests
└── package.json
```

Each feature is a Nest module:

```text
<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── dto/                        # request DTOs (and response DTOs where used)
├── entities/                   # TypeORM entities
└── <feature>.service.spec.ts   # unit tests next to the code
```

## 2. Request lifecycle

```text
HTTP request  (/api/...)
  → global ValidationPipe      validates and transforms the DTO
    → JwtAuthGuard             only on protected routes
      → Controller             adapts HTTP, stays thin
        → Service              business rules, transactions
          → TypeORM repository / entity
            → PostgreSQL
        ← DTO / plain object   what the client is allowed to see
      ← JSON response
```

## 3. Layer responsibilities

| Layer | Does | Does not |
| --- | --- | --- |
| Module | Wires controllers, services and entities together | Contain logic |
| Controller | Routes, reads params/body, calls one service method, returns the result | Contain business rules or talk to the database |
| DTO | Describes and validates request bodies and queries (`class-validator`) | Contain logic |
| Service | Implements the use case, owns the transaction, enforces booking rules | Know about `Request`/`Response` objects |
| Entity | Maps a table: columns and relations | Contain use-case logic |
| Guard / Strategy | Authenticates and authorizes | Contain business rules |

Extra rules:

- Never return a raw entity if it has fields the client must not see (for example password hashes). Map to a response DTO or select explicit fields.
- Use TypeORM repositories directly in services. A custom repository class is only worth it for a complex query that is reused.
- Modules do not reach into each other's repositories; export and inject the other module's service instead.

## 4. Authentication and token revocation

```text
Login:   POST /api/TODO → find user → bcryptjs.compare → sign JWT → return token
Request: Authorization: Bearer <JWT> → JwtStrategy validates signature/expiry
                                     → check the token is not in the revocation table
                                     → attach user to the request
Logout:  POST /api/TODO → store the token (or its id/jti) in the revocation table
```

- Revocation lives in **PostgreSQL**. `TODO: table name, what is stored (whole token, hash or jti), and whether expired rows are cleaned up.`
- `RedisService` exists but is not registered in any module and must not be used unless a task says so.
- Token lifetime: `TODO`. Refresh tokens: `TODO: yes/no`.
- Roles / permissions: `TODO: e.g. client vs professional/admin, and which guard checks it.`
- A user may only read and change their own appointments unless their role says otherwise. This check is applied in the service query, not only in the controller.

## 5. Errors

Nest's exception filter produces the response; keep the default shape unless there is a reason to change it.

```json
{ "statusCode": 400, "message": ["email must be an email"], "error": "Bad Request" }
```

| Status | When |
| --- | --- |
| `400` | Invalid input (`ValidationPipe`) |
| `401` | Missing, invalid, expired or revoked token |
| `403` | Authenticated but not allowed |
| `404` | Resource does not exist (or is not visible to this user) |
| `409` | Conflict, for example the slot is already booked |
| `500` | Unexpected failure; no internal details in the body |

Throw Nest's built-in exceptions (`BadRequestException`, `ConflictException`, ...) from services. Do not build error responses by hand in controllers. `TODO: mention any custom exception filter.`

## 6. Persistence and migrations

- PostgreSQL is hosted on **Neon** (SSL required). The connection is configured in `TODO: app.module.ts / data-source file` from environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`; see `.env.example`).
- Because the database is remote, running a migration changes a real database that teammates may share. `TODO: state whether each developer has their own Neon database/branch.`
- Schema changes go through migrations only; `synchronize` stays off.
- Workflow: change the entity → generate a migration → **read it** → run it → commit both. Never edit a migration that was already merged.
- Commands: `TODO: generate / run / revert`.

## 7. Transactions and booking concurrency

- The service owns the transaction of a use case (`DataSource.transaction(...)` or a `QueryRunner`).
- Two requests for the same slot at the same time must result in one booking and one `409`. Enforced by: `TODO: unique constraint / exclusion constraint / row lock inside a transaction`.
- A check-then-insert in application code alone is **not** enough; the database has to be the final guard.

## 8. Tests

- **Unit:** Jest, `*.spec.ts` next to the code. Test services with mocked repositories.
- **E2E:** Supertest in `test/`. `TODO: real test database or not, and how it is set up.`
- Cover for each endpoint: authentication, access to another user's data, invalid input, and the main success path. For booking, cover the conflict case.
- Tests never use the development database.

## 9. Adding a feature (checklist)

1. Create `<feature>/` by copying the structure of the reference module (`TODO: appointments`).
2. Entity → migration (generate, review, run).
3. DTOs with validation decorators.
4. Service with the business rules; controller with thin routes.
5. Protect routes with the guard; apply the ownership check in the service.
6. Register the module in `app.module.ts`.
7. Add unit and e2e tests.
8. If the contract changed, describe it in the PR (the frontend is in another repository) so it can be updated.

## 10. Not in this project (on purpose)

- No API versioning in URLs and no separate API "surfaces": one API under `/api`.
- No Action classes, no generic repository layer.
- No generated OpenAPI documentation. `TODO: confirm, or note if @nestjs/swagger is in use.`
- No Redis in the running system.
- No queues or background workers. `TODO: confirm.`
