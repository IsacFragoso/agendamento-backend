# Sistema de Agendamento de Serviços - Back-end (API Node.js)

API RESTful desenvolvida para gerenciar o ecossistema de agendamento de serviços entre prestadores e clientes, servindo como protótipo para o Trabalho de Conclusão de Curso (TCC).

## 🚀 Tecnologias Utilizadas

* **Node.js** - Ambiente de execução JavaScript
* **Express** - Framework web para rotas e requisições HTTP
* **CORS** - Middleware para permissão de requisições do front-end

## 📌 Requisitos Funcionais Implementados

* **RF01 - Cadastro de Usuários:** Registro com suporte aos perfis `Cliente` e `Prestador`.
* **RF02 - Autenticação:** Validação de acesso por e-mail e senha.
* **RF03 - Portfólio do Prestador:** Endpoints para criação, listagem e remoção de serviços.
* **RF04 - Agenda Flexível:** Configuração e remoção de horários de atendimento customizados por dia da semana.
* **RF05 - Agendamento do Cliente:** Rota para envio e listagem de solicitações de agendamento.
* **RF06 - Gestão de Agendamentos:** Endpoint `PATCH` para atualização de status (*Confirmado* / *Cancelado*) pelo prestador.

## 🛠️ Como Executar o Projeto

1. Clone o repositório:
   ```bash
   git clone [https://github.com/IsacFragoso/agendamento-backend.git](https://github.com/IsacFragoso/agendamento-backend.git)