# Primeiros passos

Este guia mostra como executar e testar a API de agendamento pela primeira vez.

## 1. Requisitos

Instale:

- Node.js 18 ou superior
- npm
- Acesso ao banco PostgreSQL usado pelo projeto, como Neon
- VS Code ou outro editor

Não é necessário instalar PostgreSQL localmente se você estiver usando Neon.

## 2. Abrir o projeto

Abra a pasta do projeto no VS Code. Depois, abra um terminal integrado. Se o terminal estiver na raiz do workspace, entre na pasta do backend:

```powershell
cd .\agendamento-backend
```

Se o terminal já estiver dentro de `agendamento-backend`, pule esse comando.

## 3. Instalar dependências

Execute uma vez:

```powershell
npm install
```

## 4. Configurar o ambiente

Crie ou edite o arquivo `.env` dentro de `agendamento-backend`:

```env
NODE_ENV=development
PORT=8000

DB_HOST=seu-host-do-neon
DB_PORT=5432
DB_USER=seu-usuario
DB_PASSWORD=sua-senha
DB_NAME=seu-banco
DB_SSL=true

JWT_SECRET=uma-chave-longa-e-secreta
JWT_EXPIRATION=3600
```

Não compartilhe o `.env` e nunca coloque senhas reais no Git. O arquivo `.env` já deve estar protegido pelo `.gitignore`.

Como o projeto usa Neon, não execute `CREATE DATABASE`. O banco já existe no projeto Neon.

## 5. Executar as migrations

As migrations criam e atualizam as tabelas do sistema:

```powershell
npm.cmd run migration:run
```

Se aparecer `No migrations are pending`, o banco já está atualizado.

A migration inicial cria as tabelas do sistema e não deve ser executada sobre tabelas existentes com estrutura diferente. Para um banco já configurado, execute somente migrations pendentes.

## 6. Iniciar a API

Em um terminal, execute:

```powershell
npm.cmd run start:dev
```

Deixe esse terminal aberto. A API estará disponível em:

```text
http://localhost:8000/api
```

Use apenas uma instância da API na porta `8000`. Se aparecer `EADDRINUSE`, outra instância já está em execução.

Para verificar se a API está funcionando, abra um segundo terminal e execute:

```powershell
Invoke-RestMethod http://localhost:8000/api/health
```

A resposta esperada contém `status: ok`.

## 7. Criar um usuário cliente

Use o segundo terminal, mantendo o primeiro com a API em execução:

```powershell
$cliente = @{
  nome_completo = "Cliente de Teste"
  email = "cliente.teste@example.com"
  telefone = "11999999999"
  tipo_conta = "CLIENTE"
  senha = "SenhaTeste123"
} | ConvertTo-Json

$clienteCriado = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/usuarios" `
  -ContentType "application/json" `
  -Body $cliente

$clienteCriado
```

Guarde o `id_usuario` retornado. O frontend normalmente não pede esse ID ao usuário; ele é usado internamente pela aplicação.

## 8. Criar um usuário prestador

```powershell
$prestador = @{
  nome_completo = "Prestador de Teste"
  email = "prestador.teste@example.com"
  telefone = "11888888888"
  tipo_conta = "PRESTADOR"
  senha = "SenhaTeste123"
} | ConvertTo-Json

$prestadorCriado = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/usuarios" `
  -ContentType "application/json" `
  -Body $prestador

$prestadorCriado
```

Ao criar um `PRESTADOR`, o backend cria automaticamente o `perfil_prestador` correspondente.

## 9. Fazer login

O login é feito pela rota de autenticação:

```powershell
$login = @{
  email = "cliente.teste@example.com"
  senha = "SenhaTeste123"
} | ConvertTo-Json

$auth = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/auth/login" `
  -ContentType "application/json" `
  -Body $login

$token = $auth.access_token
$token.Length
```

O token fica armazenado somente na sessão atual do PowerShell. Se você abrir outro terminal, será necessário fazer login novamente.

## 10. Usar uma rota protegida

Envie o token no header `Authorization`:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8000/api/usuarios/$($auth.usuario.id_usuario)" `
  -Headers @{ Authorization = "Bearer $token" }
```

Sem token, uma rota protegida deve retornar `401 Unauthorized`:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8000/api/usuarios/1"
```

## 11. Pesquisar prestadores

A busca pública não usa `GET /api/usuarios`, pois essa rota é administrativa. Use:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8000/api/prestadores?nome=Prestador"
```

Outros filtros disponíveis:

```text
/api/prestadores?categoria=Beleza
/api/prestadores?servico=Manicure
/api/prestadores?latitude=-23.55&longitude=-46.63&raio_km=25
```

A busca retorna somente prestadores ativos, serviços ativos e dados públicos.

## 12. Criar uma categoria

O gerenciamento de categorias exige uma conta `ADMIN`:

```powershell
$categoria = @{ nome = "Beleza" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/categorias" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -ContentType "application/json" `
  -Body $categoria
```

O cadastro público não permite criar `ADMIN`. Para testes locais, um usuário existente pode ser promovido por um procedimento administrativo no banco:

```sql
UPDATE usuario
SET tipo_conta = 'ADMIN'
WHERE email = 'email-do-usuario@example.com';
```

Depois da alteração, faça login novamente para receber um token com o novo papel.

## 13. Criar um serviço

O prestador envia os dados do serviço. No contrato atual, `id_prestador` ainda faz parte da requisição, mas deve ser preenchido internamente pelo frontend a partir do prestador autenticado, nunca digitado pelo usuário:

```powershell
$servico = @{
  titulo = "Manicure"
  descricao = "Servico de manicure"
  preco = 40
  duracao_padrao = 60
  id_prestador = 2
  id_categoria = 1
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/servicos" `
  -Headers @{ Authorization = "Bearer $prestadorToken" } `
  -ContentType "application/json" `
  -Body $servico
```

O prestador só pode criar, atualizar ou remover serviços do próprio perfil. Admins podem administrar serviços de outros prestadores.

## 14. Criar um agendamento

O cliente seleciona um serviço na tela e envia somente o serviço e o período:

```powershell
$agendamento = @{
  id_servico = 1
  data_hora_inicio = "2026-09-01T10:00:00Z"
  data_hora_fim = "2026-09-01T11:00:00Z"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/agendamentos" `
  -Headers @{ Authorization = "Bearer $clienteToken" } `
  -ContentType "application/json" `
  -Body $agendamento
```

O backend identifica o cliente pelo JWT e encontra automaticamente o prestador por meio do serviço selecionado. O cliente não envia `id_cliente` nem `id_prestador`.

## 15. Executar os testes automatizados

Os testes são isolados e não alteram o banco Neon:

```powershell
npm.cmd run test:api
```

Resultado esperado:

```text
Test Suites: todas passaram
Tests: todos passaram
```

Para compilar o backend:

```powershell
npm.cmd run build
```

## 16. Problemas comuns

### `EADDRINUSE: address already in use :::8000`

A porta já está sendo usada por outra instância da API. Use a instância existente ou encerre o processo anterior antes de iniciar outra.

### `401 Unauthorized`

Verifique se:

- o login foi feito com a senha correta;
- `$token` foi salvo na mesma sessão do PowerShell;
- o header usa exatamente `Bearer $token`;
- o token não expirou;
- a conta não foi desativada.

### `403 Forbidden`

O token é válido, mas o papel ou a propriedade do recurso não permite a operação. Por exemplo, um cliente não pode alterar o serviço de um prestador.

### `No migrations are pending`

Isso significa que o banco já possui todas as migrations disponíveis. Não é um erro.

### `Cannot find module dist/main`

Compile o backend antes de iniciar a versão de produção:

```powershell
npm.cmd run build
npm.cmd run start:prod
```

## Próximo passo

Depois de confirmar que a API funciona, defina as telas do frontend e relacione cada tela aos endpoints necessários. A busca de prestadores deve usar `GET /api/prestadores`, enquanto informações privadas devem usar as rotas protegidas com JWT.
