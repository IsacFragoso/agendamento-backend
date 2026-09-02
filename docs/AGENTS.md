# Agentsbackend.md - Diretrizes Genericas para Backend

Este arquivo define regras para desenvolvedores, agentes de IA e automacoes que trabalham em um backend HTTP. Ele foi escrito para ser adaptado a diferentes linguagens, frameworks e produtos.

Os placeholders entre `<` e `>` devem ser substituidos pelos contratos do projeto. Quando uma regra nao se aplicar, registre a excecao em uma decisao arquitetural; nao a remova silenciosamente.

---

## 1. Objetivo e escopo

O backend deve oferecer APIs previsiveis, versionadas, testaveis e seguras. A organizacao recomendada separa:

```text
HTTP adapter
  -> middleware
    -> request/schema
      -> controller
        -> service/use case
          -> action/repository/model
            -> database ou integracao
          -> resource/DTO
        -> resposta HTTP
```

As regras deste documento se aplicam a:

- rotas e superficies da API;
- autenticacao, autorizacao, CORS e rate limiting;
- validacao e serializacao;
- Services, Actions, Models e Repositories;
- migrations, filas, comandos e integracoes;
- testes, OpenAPI, scripts e automacoes.

---

## 2. Regras arquiteturais obrigatorias

### 2.1. Superficies sao fronteiras

- Cada superficie possui consumidor, escopo de dados e politica de autenticacao definidos.
- Routes, Requests e Resources nao devem ser compartilhados quando o contrato ou permissao divergir.
- Casos de uso compartilhados vivem em Services e nao dependem de HTTP.
- Um Controller nunca deve chamar outro Controller.
- Uma superficie nao deve importar adaptadores HTTP de outra superficie.

### 2.2. Versionamento e explicito

- A URL deve declarar a versao: `/api/<surface>/v<n>/...`.
- Mudanca breaking exige nova versao.
- Versoes antigas continuam atendendo durante a janela de deprecacao acordada.
- Uma nova versao deve possuir rotas, Requests, Resources e testes identificaveis.
- Nao altere silenciosamente o shape de uma resposta usada por consumidores existentes.

### 2.3. Pipeline de endpoint

Todo endpoint deve seguir, quando aplicavel:

```text
Route
  -> Middleware
    -> Request/Schema
      -> Controller
        -> Service
          -> Action/Repository/Model
        -> Resource/DTO
```

- Route file apenas declara rotas.
- Middleware trata preocupacoes transversais.
- Request valida e autoriza entrada.
- Controller adapta HTTP e permanece fino.
- Service coordena o caso de uso e a transacao.
- Action executa um passo coeso.
- Resource ou DTO define a resposta publica.

### 2.4. Transacoes

- O Service e o dono da transacao do caso de uso.
- Actions nao abrem transacoes independentes.
- Nao mantenha uma transacao aberta durante chamadas de rede ou operacoes demoradas.
- Efeitos externos devem ocorrer depois do commit, por fila ou por Outbox.
- Operacoes repetiveis devem considerar idempotencia e concorrencia.

### 2.5. Persistencia

- Use ORM ou query builder com parametros vinculados.
- Model deve conter relacoes, casts e scopes simples.
- Crie Repository somente para complexidade real, reutilizacao, multiplas fontes ou locking especializado.
- Nao crie um Repository generico apenas para encapsular CRUD trivial.
- Toda query privada deve aplicar o escopo de visibilidade antes da filtragem do cliente.

### 2.6. Entrada e saida

- Nenhum Service recebe Request HTTP cru.
- Controllers passam dados validados, Models e objetos de dominio.
- Nunca retorne Model ou Collection cru em uma API publica sem decisao documentada.
- Separe tipos de listagem, detalhe, entrada e persistencia quando os shapes divergirem.
- Mantenha o envelope de erro estavel dentro de uma versao.

---

## 3. Seguranca - SHIELD

### 3.1. Entrada sempre nao confiavel

- Valide tipo, formato, tamanho, cardinalidade e limites.
- Autorize o recurso e a operacao, nao apenas a presenca de uma sessao.
- IDs, filtros, ordenacao e campos de escrita enviados pelo cliente devem passar por whitelist.
- Nao monte identificadores SQL a partir de input sem whitelist.
- Nunca confie apenas na validacao do frontend.

### 3.2. Autenticacao e autorizacao

- Auth deve ser aplicada por grupo de middleware quando varias rotas compartilham a politica.
- Rotas privadas nao devem depender de redirect para HTML.
- Diferencie `401` de `403`.
- Aplique isolamento por usuario, organizacao ou tenant na query base.
- Tokens devem usar armazenamento e transporte apropriados ao modelo de sessao.
- Nunca registre tokens, senhas, cookies completos ou secrets.

### 3.3. CORS e rede

- Origem, metodos e headers permitidos devem vir de configuracao segura.
- Nao use `*` com credenciais.
- Valide proxy e headers encaminhados de acordo com o ambiente.
- Rate limiting deve existir nas superficies de maior risco.
- Endpoints de health nao devem expor diagnosticos sensiveis.

### 3.4. Uploads e objetos

- Valide permissao, tamanho, extensao e MIME no backend.
- Prefira URLs pre-assinadas para objetos grandes.
- Nao confie no nome original nem no Content-Type informado pelo cliente.
- Evite manter arquivos pesados em memoria ou dentro de transacoes.
- Confirme a vinculacao do objeto ao dominio dentro de uma operacao consistente.

### 3.5. Erros e logs

- Retorne mensagens seguras, sem stack trace ou detalhes de infraestrutura em producao.
- Diferencie validacao, autenticacao, autorizacao, conflito, rate limit e falha interna.
- Registre erros inesperados com request ID e contexto minimo necessario.
- Remova dados pessoais e credenciais dos logs.
- Falhas de integracao devem ser visiveis e observaveis, nao engolidas por `catch` vazio.

---

## 4. Convencoes de codigo

### 4.1. Naming

| Elemento | Convencao recomendada |
|---|---|
| Classes, interfaces e DTOs | `PascalCase` |
| Metodos e variaveis | `camelCase` |
| Tabelas e colunas | convencao do banco, normalmente `snake_case` |
| Services | `<Case>Service` |
| Actions | verbo + entidade, como `Persist<Case>` |
| Controllers | `<Resource>Controller` |
| Requests | `Store<Thing>Request`, `Update<Thing>Request`, `Index<Thing>Request` |
| Resources | `<Thing>Resource` |
| Testes | `<Thing>Test` ou convencao do runner |
| Pastas de Requests | uma subpasta por recurso e versao |

Use nomes que expressem intencao de negocio. Evite `Helper`, `Manager`, `Utils` e `Service` genericos sem uma responsabilidade definida.

### 4.2. Clean Code

- Prefira guard clauses e caminhos felizes curtos.
- Mantenha Controllers e Actions pequenos.
- Extraia uma funcao quando houver responsabilidade ou regra nomeavel, nao apenas por tamanho.
- Nao esconda query, transacao ou chamada externa em efeitos colaterais inesperados.
- Comentarios devem explicar o porquê de uma decisao nao obvia.
- Nao copie uma implementacao inteira sem confirmar que o contrato e equivalente.

### 4.3. Dependencias

- Use injecao de dependencias para Services, Actions, Repositories e portas externas.
- Nao acople regra de negocio a Request, Response, facade HTTP ou variavel global.
- Contratos devem estar proximos da fronteira que abstraem.
- Nao adicione interface para uma unica implementacao sem uma necessidade de variacao, teste ou integracao clara.

---

## 5. Listagens e contratos de consulta

Use um contrato consistente:

```text
GET /api/<surface>/v1/<resources>?page=2&per_page=20&search=text&filter[status]=active&sort=-created_at,name
```

Regras:

- `page` deve ser inteiro com minimo de 1;
- `per_page` deve possuir limite absoluto definido pelo backend;
- `search` deve operar somente nas colunas declaradas;
- `filter[campo]` deve possuir regra de validacao e whitelist;
- `sort` deve aceitar apenas colunas declaradas e direcao controlada;
- valores devem ser parametrizados pelo query builder;
- mudanca de contrato exige versionamento ou estrategia de compatibilidade.

Separe as responsabilidades:

```text
IndexRequest       -> le, valida e normaliza
IndexCriteria      -> declara capacidades e valores
QueryApplier       -> aplica busca, filtros, sort e paginacao
Controller         -> monta a query base de seguranca
Resource           -> serializa dados e metadados
```

Filtros avancados devem viver em scopes ou objetos de consulta especializados. Nao coloque regra de negocio de leitura em Actions de escrita.

---

## 6. OpenAPI e documentacao

- A documentacao deve nascer dos contratos reais sempre que possivel.
- Requests ou schemas definem entradas e query params.
- Resources e return types definem respostas.
- Routes definem paths, metodos e parametros.
- Status codes devem ser explicitos.
- O CI deve gerar ou validar o documento OpenAPI.
- Se houver uma API por superficie, considere um documento separado por superficie.
- Toda mudanca breaking deve atualizar changelog e documentacao de migracao.

A ferramenta escolhida pode ser substituida. O requisito e evitar documentacao manual que diverge do codigo.

---

## 7. Testes

### 7.1. Organizacao

```text
tests/
├── Feature/
│   └── <Surface>/V1/<ResourceTest.php>
└── Unit/
    ├── Services/
    ├── Actions/
    └── Support/
```

### 7.2. Cobertura minima esperada

- autenticacao e autorizacao;
- isolamento de dados por usuario, organizacao ou tenant;
- status code e envelope de resposta;
- validacao de entrada;
- casos de uso de escrita;
- paginacao, busca, filtros e ordenacao;
- concorrencia, idempotencia e conflitos importantes;
- filas, uploads e integracoes criticas;
- contratos de versoes mantidas.

Use banco isolado, factories e doubles controlados. Testes nao devem depender de banco de desenvolvimento, internet ou servicos externos reais sem uma razao documentada.

---

## 8. Comandos e automacoes

O projeto deve documentar comandos para:

```bash
# instalar dependencias
<package-manager> install

# configurar ambiente
<framework-cli> setup

# migrar banco
<framework-cli> migrate

# executar testes
<framework-cli> test

# listar rotas
<framework-cli> route:list

# gerar documentacao
<framework-cli> <openapi-command>
```

Substitua os placeholders pelos comandos reais. Geradores locais devem seguir as regras:

- validar argumentos antes de escrever;
- usar nomes singulares e namespaces consistentes;
- criar arquivos conforme a estrutura do caso de uso;
- falhar antes de sobrescrever arquivos existentes, salvo confirmacao;
- produzir saida deterministica;
- informar arquivos criados;
- retornar codigo de erro em falhas;
- oferecer dry-run para operacoes em lote quando possivel.

---

## 9. Instrucoes para agentes de IA

### 9.1. Antes de editar

1. leia este arquivo e as instrucoes locais do repositorio;
2. leia a documentacao do pattern e a especificacao da API afetada;
3. localize o route file, Controller, Request, Service e Resource do fluxo;
4. leia um endpoint vizinho com a mesma superficie e versao;
5. verifique o estado do workspace e preserve alteracoes existentes;
6. formule uma hipotese local sobre a causa do problema;
7. defina uma verificacao barata que possa refutar a hipotese;
8. confirme se a mudanca e compativel ou exige nova versao;
9. so entao escolha a menor edicao plausivel.

Nao comece por uma refatoracao ampla se o comportamento pode ser corrigido no ponto que o controla.

### 9.2. Durante a edicao

- mantenha Route files sem logica de negocio;
- mantenha Controllers finos;
- passe somente dados validados aos Services;
- deixe o Service controlar a transacao;
- mantenha Actions coesas e sem transacoes aninhadas desnecessarias;
- use Resources ou DTOs para respostas;
- aplique escopo de autorizacao antes de filtros do cliente;
- use whitelist para busca, filtros e ordenacao;
- preserve o envelope de erros;
- nao compartilhe Requests ou Resources entre superficies com contratos diferentes;
- nao introduza Repository generico sem necessidade concreta;
- atualize migrations, factories, testes e documentacao quando o contrato mudar;
- nao coloque segredos, tokens ou dados pessoais em arquivos, testes ou logs.

### 9.3. Depois da edicao

1. execute primeiro o teste ou verificacao mais estreita do endpoint alterado;
2. rode formatador e linter da linguagem;
3. execute testes Feature e Unit relevantes;
4. rode migrations em banco de teste ou validacao equivalente;
5. gere ou valide OpenAPI se o contrato HTTP mudou;
6. confira status codes, autorizacao, isolamento de dados e envelope de erros;
7. revise o diff para identificar alteracoes acidentais;
8. registre qualquer comando nao executado e o motivo;
9. nunca faca commit, push, deploy, reset destrutivo ou troca de branch automaticamente.

### 9.4. Ao criar um endpoint

- escolha a superficie e a versao;
- declare a rota no arquivo correto;
- crie Request com `rules` e autorizacao;
- crie ou reutilize o Service correto;
- crie Actions somente para passos coesos;
- aplique a transacao no Service;
- retorne Resource ou DTO;
- adicione testes de autorizacao, validacao e comportamento;
- atualize OpenAPI, changelog e documentacao;
- verifique se o endpoint nao vaza campos ou relacoes indevidas.

### 9.5. Ao criar ou alterar uma migration

- verifique impacto em dados existentes;
- defina indexes, constraints e foreign keys conscientemente;
- considere reversibilidade e deploy gradual;
- nao remova dados ou colunas sem plano de migracao;
- adicione factory e testes quando o schema afetar um fluxo existente;
- nunca rode migration destrutiva em ambiente compartilhado sem autorizacao.

### 9.6. Regras para automacoes

- comandos destrutivos exigem autorizacao explicita;
- geradores nao podem sobrescrever silenciosamente;
- scripts devem validar ambiente e argumentos;
- operacoes em lote devem ser limitadas, rastreaveis e interrompiveis;
- logs de automacao nao podem conter segredos;
- deploy e alteracao de infraestrutura exigem aprovacao humana;
- automacoes devem produzir diff ou relatorio revisavel;
- falhas devem ser barulhentas, acionaveis e retornar codigo diferente de zero.

### 9.7. Checklist de revisao do agente

- [ ] a mudanca esta na camada correta;
- [ ] a superficie e a versao foram respeitadas;
- [ ] input foi validado e autorizado;
- [ ] Controller nao absorveu regra de negocio;
- [ ] Service controla a transacao quando necessario;
- [ ] escopo de visibilidade nao pode ser contornado por filtros;
- [ ] resposta usa Resource ou DTO apropriado;
- [ ] busca, filtro e sort usam whitelist;
- [ ] erros e status codes estao estaveis;
- [ ] testes relevantes foram criados ou executados;
- [ ] OpenAPI e documentacao foram atualizados;
- [ ] nenhuma operacao destrutiva ou publicacao foi feita sem autorizacao.

---

## 10. Governanca e decisoes do projeto

Cada projeto que adotar estas regras deve registrar:

- superficies e seus consumidores;
- estrategia de autenticacao e autorizacao;
- versoes mantidas e politica de deprecacao;
- contrato de erros;
- limites de Service, Action, Model e Repository;
- formato de listagens e paginacao;
- estrategia de uploads, filas e efeitos externos;
- requisitos de logs e dados sensiveis;
- comandos de desenvolvimento e CI;
- cobertura minima de testes;
- processo de revisao humana para agentes e automacoes.

As excecoes devem ser locais, justificadas e testadas. Uma regra global nao deve ser enfraquecida para acomodar um caso isolado sem documentar o custo arquitetural.

---

_Documento base para adaptacao. Substitua os placeholders e registre as decisoes especificas do projeto._
