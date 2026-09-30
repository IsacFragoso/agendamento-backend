# Backend architecture

REST API for the appointment-booking system (school project). The frontend is a separate repository, https://github.com/IsacFragoso/agendamento-frontend: a React 19 + Vite SPA that calls this API with `fetch` and a JWT in the `Authorization: Bearer` header.

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
│   ├── modules/auth/            # login, JWT strategy, guards, revocation
│   ├── modules/users/           # users and provider profiles
│   ├── modules/appointments/    # bookings and reviews
│   ├── modules/services/        # services and categories
│   ├── modules/schedules/       # provider weekly schedules
│   ├── common/                  # shared utilities and storage integration
│   └── database/migrations/     # TypeORM migrations
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
Login:   POST /api/auth/login → find user → bcryptjs.compare → sign JWT → return token
Request: Authorization: Bearer <JWT> → JwtStrategy validates signature/expiry
                                     → check the token is not in the revocation table
                                     → attach user to the request
Logout:  POST /api/auth/logout → store the token in the revocation table
```

- Revocation lives in **PostgreSQL**, in `revoked_tokens`. The table stores the whole token and its expiration timestamp. An index exists on `expires_at`, but the current code does not clean up expired rows automatically.
- `RedisService` exists but is not registered in any module and must not be used unless a task says so.
- Token lifetime: `JWT_EXPIRATION` seconds, defaulting to `3600` in the JWT module. Refresh tokens are not implemented.
- Roles / permissions: `CLIENTE`, `PRESTADOR`, and `ADMIN` are carried in the JWT and refreshed from the database during JWT validation. `JwtAuthGuard` protects authenticated routes and `AdminGuard` restricts administrator-only routes. Ownership checks remain in the relevant service.
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

Throw Nest's built-in exceptions (`BadRequestException`, `ConflictException`, ...) from services. Do not build error responses by hand in controllers. No custom exception filter is registered; Nest's default exception handling is used.

## 6. Persistence and migrations

- PostgreSQL is hosted on **Neon** (SSL required). The application connection is configured in `src/database/database.module.ts`, and the migration datasource is configured in `src/database/data-source.ts`, using environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`; see `.env.example`).
- The team currently shares one Neon database for development. Running a migration changes shared data and requires explicit authorization. No separate Neon branch or test database is currently configured.
- Schema changes go through migrations only; `synchronize` stays off.
- Workflow: change the entity → generate a migration → **read it** → run it → commit both. Never edit a migration that was already merged.
- Commands: `npm.cmd run build`, then `npm.cmd run migration:run` or `npm.cmd run migration:revert`. The scripts use the compiled datasource at `dist/src/database/data-source.js`.

## 7. Transactions and booking concurrency

- The service owns the transaction of a use case (`DataSource.transaction(...)` or a `QueryRunner`).
- The service currently checks for overlapping non-cancelled appointments before inserting, and returns `409` when it finds one. There is no database exclusion constraint, unique constraint, or locking transaction enforcing this invariant yet.
- A check-then-insert in application code alone is **not** enough for concurrent requests; database-level overlap protection remains a known limitation before unattended self-service booking is enabled.

## 8. Tests

- **Unit:** Jest, `*.spec.ts` next to the code. Test services with mocked repositories.
- **API tests:** Supertest and Jest in `test/`. The current test app overrides guards and injects mocked services; it does not connect to PostgreSQL. There is no dedicated persistence test database.
- Cover for each endpoint: authentication, access to another user's data, invalid input, and the main success path. For booking, cover the conflict case.
- Tests never use the development database.

## 9. Adding a feature (checklist)

1. Create `src/modules/<feature>/` by following the existing module structure, with `appointments/` as the closest reference for controller/service/entity organization.
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
- No generated OpenAPI documentation; `@nestjs/swagger` is not a dependency.
- No Redis in the running system.
- No queues or background workers are configured.
