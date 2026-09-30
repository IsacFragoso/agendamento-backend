# API de Agendamento

Este repositório contém a API REST de backend de um sistema acadêmico de agendamento. A API disponibiliza endpoints JSON para a aplicação e persiste os dados no PostgreSQL; o frontend é mantido separadamente.

## Tecnologias

- Node.js e TypeScript
- NestJS 10 com o adaptador Express
- PostgreSQL, TypeORM e `pg`
- Autenticação Passport JWT; hash de senhas com `bcryptjs`
- Validação de DTOs com `class-validator` e `class-transformer`
- Jest, `ts-jest` e Supertest

## Pré-requisitos

- Node.js 18+ (informado no README existente; `package.json` não declara um campo `engines`)
- npm
- PostgreSQL local ou hospedado
- O funcionamento da aplicação não exige Docker. TODO: documentar uma configuração com Docker caso ela seja desejada; não há arquivo Docker Compose no repositório.

## Primeiros passos

1. Clone este repositório:

   ```powershell
   https://github.com/IsacFragoso/agendamento-backend
   ```

2. Instale as dependências a partir da raiz do repositório:

   ```powershell
   npm install
   ```

3. Copie `.env.example` para `.env` na raiz do repositório e configure os valores do seu ambiente. Não versione o arquivo `.env`.

   | Variável | Descrição |
   | --- | --- |
   | `NODE_ENV` | Ambiente de execução (`development`, `production` ou `test`). |
   | `PORT` | Porta HTTP; o modelo usa `8000`. |
   | `DB_HOST` | Host do PostgreSQL. |
   | `DB_PORT` | Porta do PostgreSQL; o modelo usa `5432`. |
   | `DB_USER` | Usuário do PostgreSQL. |
   | `DB_PASSWORD` | Senha do PostgreSQL. |
   | `DB_NAME` | Nome do banco de dados PostgreSQL. |
   | `DB_SSL` | Configuração SSL usada pela fonte de dados das migrations do TypeORM. |
   | `JWT_SECRET` | Segredo usado para assinar JWTs. Configure um valor privado localmente. |
   | `JWT_EXPIRATION` | Duração do JWT em segundos; o modelo usa `3600`. |

4. Configure o banco de dados. O projeto usa PostgreSQL hospedado no [Neon](https://neon.tech); não é necessário instalar o PostgreSQL localmente.
   - Peça a um colega acesso ao banco Neon do projeto ou crie seu próprio projeto gratuito no Neon e copie os dados de conexão.
   - Informe os dados no `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) e mantenha `DB_SSL=true`.
5. Execute as migrations do banco:

   ```powershell
   npm.cmd run migration:run
   ```

6. Inicie o servidor de desenvolvimento:

   ```powershell
   npm.cmd run start:dev
   ```

7. A API usa o prefixo global `/api` e, por padrão, fica disponível em `http://localhost:8000/api` (a porta pode ser configurada com `PORT`).

## Scripts disponíveis

- `npm run build` — compila o backend.
- `npm run format` — formata os arquivos TypeScript de código-fonte e de testes com Prettier.
- `npm run start` — inicia o NestJS.
- `npm run start:dev` — inicia o NestJS em modo de observação de alterações.
- `npm run start:debug` — inicia o NestJS em modo de depuração e observação de alterações.
- `npm run start:prod` — executa a aplicação compilada em `dist/main`.
- `npm run test:api` — executa os testes Jest usando `test/jest.config.js`.
- `npm run lint` — executa o ESLint com correções automáticas nos arquivos TypeScript correspondentes.
- `npm run migration:run` — compila o projeto e executa as migrations pendentes do TypeORM.
- `npm run migration:revert` — compila o projeto e reverte a migration mais recente do TypeORM.

## Execução dos testes

Execute `npm run test:api` para rodar os testes unitários (`*.spec.ts`) e os testes HTTP/e2e (`*.e2e-spec.ts`). Não há scripts separados para unitários e e2e em `package.json`. Os testes usam serviços e repositórios simulados e não precisam de banco de dados; não os aponte para um banco de desenvolvimento.

## Estrutura do projeto

```text
src/
├── app/        # Módulo principal da aplicação, controller e service
├── common/     # Decorators, DTOs, guards, filters, middleware e utilitários compartilhados
├── config/     # Configuração e validação do ambiente
├── database/   # Configuração do TypeORM, fonte de dados, migrations e seeds
├── modules/    # Funcionalidades de autenticação, usuários, serviços, agendas e agendamentos
├── types/      # Declarações TypeScript compartilhadas
└── main.ts     # Inicialização da aplicação; configura /api e validação
```

## Documentação

- [Arquitetura](ARCHITECTURE.md)
- [Orientações para agentes e colaboradores](AGENTS.md)

## Repositório relacionado

Frontend: <https://github.com/IsacFragoso/agendamento-frontend>. O frontend fica em um repositório separado e precisa desta API em execução para utilizar as funcionalidades de backend.

## Fluxo de trabalho da equipe

Para uma equipe de duas pessoas, mantenham `main` estável e usem branches de curta duração para cada tarefa (por exemplo, `feat/<tarefa>`, `fix/<tarefa>` ou `docs/<tarefa>`). Façam commits pequenos e focados; prefixos como `feat:`, `fix:` e `docs:` ajudam a indicar o propósito.

Abra um pull request para `main` para cada alteração e peça ao outro integrante da equipe para revisá-lo antes do merge. A revisão deve verificar o comportamento, os testes e qualquer impacto na API ou nas migrations. Antes do merge, execute `npm run lint`, `npm run build` e `npm run test:api` na raiz deste repositório. Mantenham o processo simples: uma equipe de duas pessoas não precisa de uma branch extra de release nem de um processo formal de aprovação.

## Autoria e curso

- Autores: Isaac Santos Fragoso e Jean Komuro dos Santos.
- Curso: Tecnologia em Sistemas para Internet.

---

# Appointment Booking API

This repository contains the backend REST API for a school appointment-booking system. It provides JSON endpoints for the application and persists data in PostgreSQL; the frontend is maintained separately.

## Tech Stack

- Node.js and TypeScript
- NestJS 10 with the Express adapter
- PostgreSQL, TypeORM, and `pg`
- Passport JWT authentication; `bcryptjs` password hashing
- DTO validation with `class-validator` and `class-transformer`
- Jest, `ts-jest`, and Supertest

## Prerequisites

- Node.js 18+ (stated in the existing README; `package.json` does not declare an `engines` field)
- npm
- PostgreSQL, local or hosted
- Docker is not required by the application. TODO: document a Docker setup if one is intended; no Docker Compose file is present.

## Getting Started

1. Clone this repository. 
   ```powershell
   https://github.com/IsacFragoso/agendamento-backend
   ```
2. Install dependencies from the repository root:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env` in the repository root and set the values for your environment. Do not commit `.env`.

   | Variable | Description |
   | --- | --- |
   | `NODE_ENV` | Runtime environment (`development`, `production`, or `test`). |
   | `PORT` | HTTP port; the template uses `8000`. |
   | `DB_HOST` | PostgreSQL host. |
   | `DB_PORT` | PostgreSQL port; the template uses `5432`. |
   | `DB_USER` | PostgreSQL username. |
   | `DB_PASSWORD` | PostgreSQL password. |
   | `DB_NAME` | PostgreSQL database name. |
   | `DB_SSL` | SSL setting used by the TypeORM migration data source. |
   | `JWT_SECRET` | Secret used to sign JWTs. Set a private value locally. |
   | `JWT_EXPIRATION` | JWT lifetime in seconds; the template uses `3600`. |

4.  Set up the database. The project uses PostgreSQL hosted on
   [Neon](https://neon.tech); no local PostgreSQL install is needed.
   - Ask a teammate for access to the project's Neon database, or create your
     own free Neon project and copy its connection details.
   - Put them in your `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
     `DB_NAME`) and keep `DB_SSL=true`.
5. Run the database migrations:

   ```powershell
   npm.cmd run migration:run
   ```

6. Start the development server:

   ```powershell
   npm.cmd run start:dev
   ```

7. The API uses the global `/api` prefix and defaults to `http://localhost:8000/api` (the port can be set with `PORT`).

## Available Scripts

- `npm run build` — compile the backend.
- `npm run format` — format TypeScript source and test files with Prettier.
- `npm run start` — start NestJS.
- `npm run start:dev` — start NestJS in watch mode.
- `npm run start:debug` — start NestJS in debug/watch mode.
- `npm run start:prod` — run the compiled application from `dist/main`.
- `npm run test:api` — run Jest tests using `test/jest.config.js`.
- `npm run lint` — run ESLint with automatic fixes on matching TypeScript files.
- `npm run migration:run` — build and run pending TypeORM migrations.
- `npm run migration:revert` — build and revert the latest TypeORM migration.

## Running Tests

Run `npm run test:api` for both unit (`*.spec.ts`) and HTTP/e2e (`*.e2e-spec.ts`) tests. There are no separate unit or e2e scripts in `package.json`. The tests use mocked services/repositories and do not require a database; do not point tests at a development database.

## Project Structure

```text
src/
├── app/        # Root application module and controller/service
├── common/     # Shared decorators, DTOs, guards, filters, middleware, and utilities
├── config/    # Environment configuration and validation
├── database/  # TypeORM setup, data source, migrations, and seeds
├── modules/   # Auth, users, services, schedules, and appointments features
├── types/     # Shared TypeScript declarations
└── main.ts    # Application bootstrap; configures /api and validation
```

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Agent and contributor guidance](AGENTS.md)

## Related Repository

Frontend:<https://github.com/IsacFragoso/agendamento-frontend>. The frontend is a separate repository and needs this API running to use backend features.

## Team Workflow

For a two-person team, keep `main` stable and use short-lived branches for each task (for example, `feat/<task>`, `fix/<task>`, or `docs/<task>`). Make small, focused commits; prefixes such as `feat:`, `fix:`, and `docs:` help explain their purpose.

Open a pull request into `main` for each change and have the other teammate review it before merging. The reviewer should check the behavior, tests, and any API or migration impact. Before merging, run `npm run lint`, `npm run build`, and `npm run test:api` from this repository's root. Keep the process lightweight: no extra release branch or approval ceremony is needed for a two-person project.

## Authors and Course

- Authors:  Isaac Santos Fragoso, Jean Komuro dos Santos.
- Course: Tecnologia em Sistemas para Internet.