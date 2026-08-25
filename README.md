# API de Agendamento

Backend REST para uma plataforma de agendamento de serviços entre clientes e prestadores.

## Stack

- Node.js 18+
- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- JWT e Passport
- Jest e Supertest

## Estrutura

```text
src/
├── app/                 # Módulo principal e health check
├── config/              # Configuração e validação do ambiente
├── database/            # TypeORM, data source e migrations
└── modules/
    ├── auth/            # Login, JWT e guards
    ├── users/           # Usuários e perfis de prestador
    ├── services/        # Categorias e serviços
    ├── schedules/       # Disponibilidade dos prestadores
    └── appointments/    # Agendamentos e avaliações

test/
├── support/             # Fábrica compartilhada dos testes
├── users/
├── services/
├── schedules/
└── appointments/
```

## Modelo de dados

As migrations criam estas tabelas:

- `usuario`: dados comuns, credenciais, tipo de conta e status ativo
- `perfil_prestador`: localização, biografia, foto e disponibilidade
- `categoria`: categorias de serviços
- `servico`: serviços oferecidos por prestadores
- `agendamento`: cliente, prestador, serviço, período e status
- `avaliacao`: nota e comentário de um agendamento

## Configuração

Crie um arquivo `.env` na raiz do backend. Não versione esse arquivo.

```env
NODE_ENV=development
PORT=8000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=agendamento
DB_SSL=false

JWT_SECRET=uma_chave_longa_e_secreta
JWT_EXPIRATION=3600
```

Para Neon ou outro PostgreSQL hospedado, use os valores fornecidos pelo provedor e `DB_SSL=true`.

## Instalação

```powershell
cd agendamento-backend
npm install
```

Como este projeto usa Neon, não é necessário criar um banco manualmente. O banco já existe no projeto Neon; apenas configure `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no `.env`.

## Banco de dados

Execute as migrations com:

```powershell
npm.cmd run migration:run
```

O histórico das migrations é armazenado na tabela `migrations`. A migration inicial cria o schema do diagrama sem apagar tabelas existentes.

Para reverter a última migration:

```powershell
npm.cmd run migration:revert
```

O backend usa `synchronize: false`; alterações de schema devem ser feitas por migrations.

## Executar

Desenvolvimento, com recarregamento automático:

```powershell
npm.cmd run start:dev
```

Produção local:

```powershell
npm.cmd run build
npm.cmd run start:prod
```

A API fica disponível em `http://localhost:8000/api`.
Execute apenas uma instância por vez para evitar conflito na porta `8000`.

Health check:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

## Testes

Os testes são HTTP/e2e isolados: usam serviços simulados, não precisam do servidor em execução e não alteram o banco Neon.

Na raiz do workspace, execute:

```powershell
npm.cmd --prefix .\agendamento-backend run test:api
```

Ou, dentro da pasta do backend:

```powershell
npm.cmd run test:api
```

Para executar somente os testes de agendamentos:

```powershell
npm.cmd run test:api -- --runTestsByPath test/appointments
```

Os testes são separados por módulo e cobrem registro, autenticação, identidade do usuário e regras de acesso para serviços, agendas, agendamentos e avaliações. O resultado esperado é uma mensagem indicando que todas as suítes e testes passaram.

## Autenticação

Cadastro e login são públicos:

```text
POST /api/usuarios
POST /api/auth/login
```

O login retorna `access_token`. Use-o nas rotas protegidas:

```http
Authorization: Bearer SEU_ACCESS_TOKEN
```

Tipos de conta:

- `CLIENTE`
- `PRESTADOR`
- `ADMIN`

O cadastro público aceita somente `CLIENTE` e `PRESTADOR`. Um administrador deve ser promovido por um procedimento administrativo seguro, nunca pelo cadastro público.

## Endpoints

### Usuários

```text
POST   /api/usuarios
GET    /api/usuarios
GET    /api/usuarios/:id                         protegido
PATCH  /api/usuarios/:id                         protegido
DELETE /api/usuarios/:id                         protegido
PUT    /api/usuarios/:id/perfil-prestador        protegido
```

O `DELETE` realiza anonimização: remove dados pessoais, desativa a conta e preserva agendamentos, avaliações e relacionamentos.

### Categorias e serviços

```text
POST   /api/categorias                            protegido
GET    /api/categorias
PATCH  /api/categorias/:id                        protegido
DELETE /api/categorias/:id                        protegido

POST   /api/servicos                              protegido
GET    /api/servicos
GET    /api/servicos/prestador/:id
PATCH  /api/servicos/:id                          protegido
DELETE /api/servicos/:id                          protegido
```

Somente o prestador dono pode alterar seus serviços. Serviços são marcados como inativos quando apropriado para preservar histórico.

### Disponibilidade

```text
GET    /api/prestadores/:id/horario
PUT    /api/prestadores/:id/horario                protegido
DELETE /api/prestadores/:id/horario                protegido
```

Somente o próprio prestador pode alterar ou limpar sua disponibilidade, salvo administradores.

### Agendamentos e avaliações

```text
POST   /api/agendamentos                            protegido
GET    /api/agendamentos                            protegido
GET    /api/agendamentos/:id                        protegido
PATCH  /api/agendamentos/:id/status                 protegido
POST   /api/agendamentos/:id/avaliacao               protegido
GET    /api/agendamentos/:id/avaliacao               protegido
PATCH  /api/agendamentos/:id/avaliacao               protegido
DELETE /api/agendamentos/:id/avaliacao               protegido
```

Regras principais:

- Clientes criam agendamentos somente para si mesmos.
- Prestadores alteram somente o status dos próprios agendamentos.
- Clientes gerenciam somente avaliações dos próprios agendamentos.
- Horários sobrepostos para o mesmo prestador são rejeitados.
- Cancelamento usa o status `CANCELADO`; agendamentos não são apagados.

Ao criar um agendamento, o cliente envia somente o serviço escolhido e o período:

```json
{
    "id_servico": 8,
    "data_hora_inicio": "2026-09-01T10:00:00Z",
    "data_hora_fim": "2026-09-01T11:00:00Z"
}
```

O backend identifica o cliente pelo JWT e deriva o prestador a partir do serviço selecionado.

## Desenvolvimento seguro

- Nunca coloque senhas, tokens ou `JWT_SECRET` no Git.
- Use `.env.example` somente com valores fictícios.
- Mantenha `DB_SSL=true` em bancos hospedados que exigem TLS.
- Não use `synchronize` em produção.
- Teste regras de autorização com contas `CLIENTE`, `PRESTADOR` e `ADMIN` separadas.
- O backend bloqueia tokens de contas desativadas.

## Scripts

```text
npm run build             Compila o backend
npm run start:dev         Executa em desenvolvimento
npm run start:prod        Executa o build de produção
npm run test:api          Executa os testes de API
npm run migration:run     Executa migrations pendentes
npm run migration:revert  Reverte a última migration
npm run lint              Executa o ESLint
npm run format            Formata os arquivos TypeScript
```
