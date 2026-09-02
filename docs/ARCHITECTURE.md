# Arquitetura Base de um Backend de API

Este documento descreve uma arquitetura reutilizavel para um backend HTTP orientado a casos de uso, validacao explicita e contratos versionados. A estrutura e compativel com frameworks como Laravel, Symfony, NestJS ou outras plataformas que oferecam roteamento, middleware, injecao de dependencias, ORM e testes de integracao.

Os nomes entre `<` e `>` sao placeholders. Substitua-os pelos nomes, contratos e ferramentas do projeto que adotar esta base.

## 1. Visao geral

O backend e organizado por tres eixos:

- **superficies da API:** fronteiras de consumo com autenticacao, autorizacao e escopos diferentes;
- **versoes:** contratos estaveis no caminho da URL;
- **casos de uso:** Services que coordenam a regra de negocio e a persistencia.

O fluxo recomendado e:

```text
Requisicao HTTP
  -> Route file
    -> Middleware de grupo
      -> Request/Schema
        -> Controller
          -> Service/Use Case
            -> Action ou Repository
              -> Model/Database
            -> Resource/DTO
          -> Resposta JSON
```

Cada camada possui uma responsabilidade clara. A camada HTTP adapta a entrada e a saida; a camada de aplicacao coordena o caso de uso; a camada de dominio ou persistencia executa regras e operacoes de dados.

## 2. Estrutura de diretorios

```text
<project-root>/
├── app/
│   ├── Console/Commands/       # comandos CLI e tarefas operacionais
│   ├── Contracts/              # interfaces e portas de infraestrutura
│   ├── Http/
│   │   ├── Controllers/        # por superficie e versao
│   │   ├── Middleware/         # auth, CORS, rate limit, contexto
│   │   ├── Requests/            # validacao e autorizacao de entrada
│   │   └── Resources/           # DTOs e representacoes de saida
│   ├── Models/                 # entidades, relacoes e casts
│   ├── Services/               # casos de uso e Actions internas
│   ├── Support/                # filtros, paginacao e infraestrutura local
│   └── Providers/              # bindings e configuracao de servicos
├── bootstrap/                  # inicializacao, middleware e excecoes
├── config/                     # configuracao por ambiente
├── database/
│   ├── factories/              # dados de teste
│   ├── migrations/             # evolucao do schema
│   └── seeders/                # dados iniciais ou de desenvolvimento
├── routes/
│   ├── api.php                 # agregador de prefixos e middleware
│   └── api/                    # rotas separadas por superficie/versao
├── tests/
│   ├── Feature/                # contratos HTTP e fluxos completos
│   └── Unit/                   # regras isoladas
├── docs/                       # API, arquitetura e operacao
└── stubs/                      # modelos dos geradores locais
```

A estrutura pode variar conforme o framework, mas as responsabilidades devem continuar identificaveis.

## 3. Superficies e versionamento

### 3.1. Superficies

Uma superficie e uma fronteira de API destinada a um consumidor ou nivel de confianca especifico. Exemplos genericos:

| Superficie | Prefixo | Autenticacao | Responsabilidade |
|---|---|---|---|
| `public` | `/api/public` | nenhuma ou limitada | consumo publico |
| `account` | `/api/account` | sessao do usuario ou organizacao | operacoes do consumidor autenticado |
| `admin` | `/api/admin` | sessao + privilegios | administracao global |

Os nomes acima sao apenas exemplos. Um projeto pode usar `client`, `internal`, `partner`, `backoffice` ou outra nomenclatura.

Cada superficie deve definir explicitamente:

- quem pode chama-la;
- quais dados pode ler ou alterar;
- quais middlewares se aplicam;
- quais Resources e FormRequests representam seus contratos;
- como ocorre o isolamento de tenant, organizacao ou usuario.

Nao compartilhe Controller, Request ou Resource entre superficies quando os contratos ou permissoes divergirem. Casos de uso compartilhados devem viver em `Services` e receber dados ja validados, sem depender da camada HTTP.

### 3.2. Versionamento

A versao deve ser explicita e seguir o formato:

```text
/api/<surface>/v<n>/<resource>
```

Regras:

- alteracao incompatível exige nova versao;
- campo novo opcional ou endpoint novo pode permanecer na mesma versao;
- versoes podem coexistir durante uma janela de migracao;
- a versao deve ser independente por superficie quando os contratos evoluirem em ritmos diferentes;
- deprecacoes devem ser anunciadas, monitoradas e removidas somente apos a janela acordada.

Estrutura recomendada:

```text
routes/
  api.php
  api/
    <surface>/
      v1.php
      v2.php

app/Http/
  Controllers/
    <Surface>/V1/
    <Surface>/V2/
  Requests/
    <Surface>/V1/<Resources>/
  Resources/
    <Surface>/V1/
```

O namespace deve espelhar o caminho adotado pelo framework.

## 4. Camadas e responsabilidades

### Route file

Mapeia URL, metodo HTTP e Controller. Nao possui regra de negocio, consulta ao banco ou transformacao complexa.

### Middleware

Executa preocupacoes transversais:

- autenticacao;
- autorizacao de alto nivel;
- CORS;
- rate limiting;
- identificacao e rastreio da requisicao;
- contexto de organizacao ou tenant;
- normalizacao de headers.

Middleware de grupo deve ser preferido a declarar autenticacao repetidamente em cada rota.

### Request ou Schema

Valida a entrada, aplica limites e autoriza a requisicao. Deve produzir dados confiaveis para o caso de uso. Nao deve abrir transacoes nem executar regras de negocio extensas.

### Controller

Adapta HTTP para a aplicacao:

1. recebe o Request validado;
2. extrai dados, usuario e parametros de rota;
3. chama o Service correspondente;
4. transforma o resultado em Resource/DTO;
5. devolve a resposta HTTP tipada.

O Controller nao deve conhecer Actions internas nem coordenar varias operacoes persistentes.

### Service ou Use Case

E a interface da aplicacao para uma operacao de negocio. Deve:

- expor metodos nomeados pela intencao do negocio;
- coordenar Actions ou Repositories;
- ser independente de Request e Response HTTP;
- receber dados ja validados;
- controlar transacoes quando o caso exigir atomicidade;
- disparar efeitos externos depois do commit ou por mecanismo confiavel.

### Action

Executa um passo pequeno, coeso e normalmente persistente dentro de um caso de uso. Actions devem ser internas ao Service que as coordena e nao devem abrir transacoes independentes ou chamar Controllers.

### Model ou Repository

- **Model:** entidade, persistencia, relacoes, casts e scopes simples.
- **Repository:** porta de persistencia somente quando houver consulta complexa reutilizada, multiplas fontes, locking ou necessidade real de trocar a infraestrutura.

Nao crie Repositories genericos que apenas repetem CRUD do ORM.

### Resource ou DTO

Define o shape publico da resposta. Nunca exponha modelos de persistencia crus por acidente. Separe representacoes de listagem, detalhe e superficies quando os campos ou relacoes divergirem.

## 5. Services e Actions

Cada caso de uso deve viver em uma pasta coesa:

```text
app/Services/
└── <Case>/
    ├── <Case>Service.php
    └── Actions/
        ├── Persist<Case>.php
        └── Write<Case>Audit.php
```

Exemplo conceitual em PHP:

```php
final class ProcessCaseService
{
    public function __construct(
        private PersistProcessCase $persistProcessCase,
        private WriteProcessAudit $writeProcessAudit,
    ) {}

    public function update(ProcessCase $case, array $attributes): ProcessCase
    {
        return DB::transaction(function () use ($case, $attributes): ProcessCase {
            $this->persistProcessCase->handle($case, $attributes);
            $this->writeProcessAudit->handle($case);

            return $case->fresh();
        });
    }
}
```

Regras:

- uma operacao atomica deve ter uma transacao no Service;
- Actions nao abrem transacoes proprias;
- Actions nao chamam outro Service para esconder um caso de uso;
- efeitos externos devem ocorrer apos commit, por fila ou Outbox;
- Services nao recebem FormRequests ou objetos acoplados ao transporte.

## 6. Listagens, busca, filtros e ordenacao

Padronize a entrada de listagens para todos os recursos:

```text
GET /api/<surface>/v1/<resources>
  ?page=2
  &per_page=20
  &search=texto
  &filter[status]=active
  &sort=-created_at,name
```

Contrato recomendado:

| Parametro | Forma | Significado |
|---|---|---|
| `page` | inteiro >= 1 | pagina solicitada |
| `per_page` | inteiro com limite | quantidade por pagina |
| `search` | string | busca textual em colunas permitidas |
| `filter[campo]` | mapa | filtro por campo permitido |
| `sort` | CSV, prefixo `-` para desc | ordenacao por colunas permitidas |

Use tres pecas:

```text
IndexRequest             # le e valida os parametros
IndexCriteria            # whitelist e valores normalizados
IndexQueryApplier        # aplica busca, filtro, sort e paginacao
```

Cada recurso deve declarar explicitamente suas colunas `searchable`, `filterable` e `sortable`. Nunca transforme input do cliente diretamente em identificador SQL.

Filtros avancados, como intervalos, consultas em relacoes e full-text, devem permanecer em scopes ou objetos de consulta especializados. Nao aumente indefinidamente o Applier generico.

O retorno paginado deve ser embrulhado por Resource/DTO, preservando `data`, metadados e links conforme o contrato escolhido. Nao monte paginacao manualmente se o framework ja fornece esse suporte.

## 7. Contratos HTTP e erros

Defina um envelope estavel por versao:

```json
{
  "message": "Mensagem segura para o consumidor",
  "errors": {
    "field": ["Mensagem de validacao"]
  },
  "request_id": "id-opcional-de-rastreio"
}
```

Comportamento recomendado:

- `401`: sessao ausente ou invalida;
- `403`: autenticado, mas sem permissao ou origem permitida;
- `404`: recurso inexistente ou nao visivel ao consumidor;
- `409`: conflito de estado ou idempotencia;
- `422`: entrada invalida;
- `429`: limite de requisicoes excedido;
- `500`: falha inesperada sem detalhes internos.

Respostas de API devem ser JSON, sem redirect para paginas HTML. O envelope de erro deve permanecer compativel dentro de uma mesma versao.

## 8. Seguranca e resiliencia

### Entrada e autorizacao

- toda entrada externa e nao confiavel;
- valide e autorize antes de executar o caso de uso;
- aplique escopo de usuario, organizacao ou tenant na query base;
- use whitelists para campos de filtro e ordenacao;
- nao confie em IDs enviados pelo cliente sem verificar acesso;
- evite mass assignment sem lista de campos permitidos.

### Banco e transacoes

- use queries parametrizadas e ORM seguro;
- mantenha transacoes no Service;
- evite transacoes longas envolvendo rede;
- use idempotencia em operacoes que possam ser repetidas;
- trate concorrencia, locking e unique constraints no banco.

### CORS e headers

- mantenha origens permitidas em configuracao;
- nao use `*` junto com credenciais;
- limite metodos e headers ao necessario;
- configure headers de seguranca no proxy ou aplicacao;
- registre rejeicoes sem vazar credenciais.

### Observabilidade

Cada requisicao relevante deve poder ser rastreada por um identificador. Registre duracao, status, rota, contexto minimo e erro, removendo tokens, senhas e dados pessoais desnecessarios.

## 9. OpenAPI e documentacao

A documentacao da API deve ser derivada dos contratos reais sempre que possivel:

- `rules()` ou schemas definem request body e query params;
- return types e Resources definem responses;
- route files definem paths e metodos;
- status codes devem ser explicitos;
- cada superficie pode gerar seu proprio documento.

A ferramenta pode ser Scramble, OpenAPI Generator, Nelmio, Swagger ou outra equivalente. O importante e que a documentacao seja validada no CI e nao dependa de comentarios que divergem do codigo.

## 10. Testes

Organize testes pela responsabilidade:

```text
tests/
├── Feature/
│   └── <Surface>/V1/<ResourceTest.php>
└── Unit/
    ├── Services/
    ├── Actions/
    └── Support/
```

Cubra pelo menos:

- autenticacao e autorizacao por superficie;
- status code e envelope de resposta;
- validacao de entrada;
- escopo de visibilidade;
- criacao, atualizacao e exclusao;
- paginacao, busca, filtros e ordenacao;
- transacoes e conflitos relevantes;
- uploads, filas ou integracoes criticas;
- regressao de contratos versionados.

Use banco isolado ou fixtures controladas. Testes nao devem depender de banco de desenvolvimento, internet ou servicos externos sem doubles explicitos.

## 11. Como replicar em outro projeto

Antes de transportar esta arquitetura, defina:

- framework e versoes suportadas;
- superfices, consumidores e politicas de autenticacao;
- convencao de versionamento;
- formato de request, response e erros;
- estrategia de persistencia e transacoes;
- limites de Service, Action, Model e Repository;
- politica de CORS, rate limit e observabilidade;
- estrategia de uploads, filas e efeitos externos;
- ferramenta de OpenAPI;
- banco e ambiente de testes;
- comandos oficiais de desenvolvimento e CI.

Ordem recomendada:

1. criar o bootstrap, configuracao e contrato de erros;
2. implementar uma superficie e uma versao pequenas;
3. criar um recurso CRUD completo como modulo de referencia;
4. adicionar testes de Feature e Unit;
5. configurar OpenAPI e validacao no CI;
6. replicar o padrao para novos recursos;
7. adicionar novas superficies ou versoes somente quando o contrato exigir.

Uma arquitetura replicavel depende de fronteiras e contratos verificaveis, nao apenas de nomes de pastas.
