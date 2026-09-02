require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database/db'); //
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());


const inicializarBanco = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome_completo VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        telefone VARCHAR(50),
        senha VARCHAR(255) NOT NULL,
        tipo_conta VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS servicos (
        id SERIAL PRIMARY KEY,
        prestador_id INT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        preco NUMERIC(10, 2) NOT NULL,
        CONSTRAINT fk_prestador_servicos FOREIGN KEY (prestador_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS agenda_prestador (
        id SERIAL PRIMARY KEY,
        prestador_id INT NOT NULL,
        dia_semana VARCHAR(50) NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fim TIME NOT NULL,
        CONSTRAINT fk_prestador_agenda FOREIGN KEY (prestador_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        cliente_id INT NOT NULL,
        servico_id INT NOT NULL,
        prestador_id INT NOT NULL,
        data_agendamento DATE NOT NULL,
        hora_agendamento TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'Pendente',
        CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
        CONSTRAINT fk_prestador FOREIGN KEY (prestador_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Conexão estabelecida e tabelas verificadas no PostgreSQL.');
  } catch (err) {
    console.error('❌ Erro ao inicializar o banco de dados:', err.message);
  }
};

inicializarBanco();

// ==========================================
// ROTAS DE AUTENTICAÇÃO E USUÁRIOS
// ==========================================

// POST /usuarios - Cadastro
app.post('/usuarios', async (req, res) => {
  try {
    const { nome_completo, email, telefone, senha, tipo_conta } = req.body;

    if (!nome_completo || !email || !senha || !tipo_conta) {
      return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
    }

    const resultado = await db.query(
      `INSERT INTO usuarios (nome_completo, email, telefone, senha, tipo_conta) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome_completo, email, tipo_conta`,
      [nome_completo, email, telefone, senha, tipo_conta]
    );

    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!', usuario: resultado.rows[0] });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err.message);
    if (err.code === '23505') {
      return res.status(400).json({ erro: 'Este e-mail já está cadastrado.' });
    }
    res.status(500).json({ erro: 'Erro interno ao cadastrar usuário.' });
  }
});

// POST /login - Autenticação
app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const resultado = await db.query(
      `SELECT id, nome_completo, email, tipo_conta, senha FROM usuarios WHERE email = $1`,
      [email]
    );

    if (resultado.rows.length === 0 || resultado.rows[0].senha !== senha) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const usuario = resultado.rows[0];
    delete usuario.senha;
    res.json({ mensagem: 'Login realizado com sucesso!', usuario });
  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
});

// ==========================================
// ROTAS DE SERVIÇOS (PORTFÓLIO)
// ==========================================

// GET /servicos - Listar todos os serviços
app.get('/servicos', async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT s.id, s.titulo, s.descricao, s.preco, s.prestador_id AS "prestadorId", u.nome_completo AS "nomePrestador"
       FROM servicos s
       JOIN usuarios u ON s.prestador_id = u.id`
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar serviços:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar serviços.' });
  }
});

// GET /servicos/:prestadorId - Listar serviços do prestador
app.get('/servicos/:prestadorId', async (req, res) => {
  try {
    const prestadorId = parseInt(req.params.prestadorId, 10);
    const resultado = await db.query(
      `SELECT id, titulo, descricao, preco, prestador_id AS "prestadorId" FROM servicos WHERE prestador_id = $1`,
      [prestadorId]
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar serviços do prestador:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar serviços.' });
  }
});

// POST /servicos - Criar serviço
app.post('/servicos', async (req, res) => {
  try {
    const { titulo, descricao, preco, prestadorId } = req.body;

    if (!titulo || !preco || !prestadorId) {
      return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
    }

    const resultado = await db.query(
      `INSERT INTO servicos (titulo, descricao, preco, prestador_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [titulo, descricao, preco, parseInt(prestadorId, 10)]
    );

    res.status(201).json({ mensagem: 'Serviço cadastrado com sucesso!', servico: resultado.rows[0] });
  } catch (err) {
    console.error('Erro ao cadastrar serviço:', err.message);
    res.status(500).json({ erro: 'Erro ao cadastrar serviço.' });
  }
});

// DELETE /servicos/:id - Deletar serviço
app.delete('/servicos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM servicos WHERE id = $1`, [parseInt(id, 10)]);
    res.json({ mensagem: 'Serviço excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir serviço:', err.message);
    res.status(500).json({ erro: 'Erro ao excluir serviço.' });
  }
});

// ==========================================
// ROTAS DE AGENDA DO PRESTADOR
// ==========================================

// GET /agenda/:prestadorId - Buscar agenda com aliases snake_case e camelCase
app.get('/agenda/:prestadorId', async (req, res) => {
  try {
    const prestadorId = parseInt(req.params.prestadorId, 10);

    if (isNaN(prestadorId)) {
      return res.status(400).json({ erro: 'ID do prestador inválido.' });
    }

    const result = await db.query(
      `SELECT id, 
              dia_semana AS dia, 
              dia_semana, 
              hora_inicio AS "horaInicio", 
              hora_inicio, 
              hora_fim AS "horaFim", 
              hora_fim 
       FROM agenda_prestador 
       WHERE prestador_id = $1 
       ORDER BY id ASC`,
      [prestadorId]
    );

    res.json({ horariosPorDia: result.rows });
  } catch (err) {
    console.error('ERRO NO GET /agenda:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar agenda: ' + err.message });
  }
});

// POST /agenda - Salvar horário
app.post('/agenda', async (req, res) => {
  try {
    const { prestadorId, dia, horaInicio, horaFim } = req.body;
    const id = parseInt(prestadorId, 10);

    if (isNaN(id) || !dia || !horaInicio || !horaFim) {
      return res.status(400).json({ erro: 'Dados incompletos para salvar agenda.' });
    }

    await db.query(
      `DELETE FROM agenda_prestador WHERE prestador_id = $1 AND dia_semana = $2`,
      [id, dia]
    );

    await db.query(
      `INSERT INTO agenda_prestador (prestador_id, dia_semana, hora_inicio, hora_fim) 
       VALUES ($1, $2, $3, $4)`,
      [id, dia, horaInicio, horaFim]
    );

    res.json({ mensagem: 'Horário salvo com sucesso!' });
  } catch (err) {
    console.error('ERRO NO POST /agenda:', err.message);
    res.status(500).json({ erro: 'Erro ao salvar agenda: ' + err.message });
  }
});

// DELETE /agenda/:prestadorId/:dia - Remover dia
app.delete('/agenda/:prestadorId/:dia', async (req, res) => {
  try {
    const prestadorId = parseInt(req.params.prestadorId, 10);
    const dia = decodeURIComponent(req.params.dia);

    if (isNaN(prestadorId) || !dia) {
      return res.status(400).json({ erro: 'Parâmetros inválidos para remoção.' });
    }

    await db.query(
      `DELETE FROM agenda_prestador WHERE prestador_id = $1 AND dia_semana = $2`,
      [prestadorId, dia]
    );

    res.json({ mensagem: 'Dia removido com sucesso!' });
  } catch (err) {
    console.error('ERRO NO DELETE /agenda:', err.message);
    res.status(500).json({ erro: 'Erro ao remover dia da agenda: ' + err.message });
  }
});

// ==========================================
// ROTAS DE AGENDAMENTOS
// ==========================================

// POST /agendamentos - Novo Agendamento
app.post('/agendamentos', async (req, res) => {
  try {
    const { clienteId, servicoId, prestadorId, data, hora } = req.body;

    if (!clienteId || !servicoId || !prestadorId || !data || !hora) {
      return res.status(400).json({ erro: 'Dados incompletos para criação do agendamento.' });
    }

    await db.query(
      `INSERT INTO agendamentos (cliente_id, servico_id, prestador_id, data_agendamento, hora_agendamento, status) 
       VALUES ($1, $2, $3, $4, $5, 'Pendente')`,
      [parseInt(clienteId, 10), parseInt(servicoId, 10), parseInt(prestadorId, 10), data, hora]
    );

    res.status(201).json({ mensagem: 'Solicitação enviada com sucesso!' });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err.message);
    res.status(500).json({ erro: 'Erro ao criar agendamento.' });
  }
});

// GET /agendamentos/prestador/:prestadorId - Solicitações do prestador
app.get('/agendamentos/prestador/:prestadorId', async (req, res) => {
  try {
    const prestadorId = parseInt(req.params.prestadorId, 10);

    const resultado = await db.query(
      `SELECT a.id, a.data_agendamento AS data, a.hora_agendamento AS hora, a.status,
              c.nome_completo AS "nomeCliente",
              s.titulo AS "tituloServico", s.preco AS "precoServico"
       FROM agendamentos a
       JOIN usuarios c ON a.cliente_id = c.id
       JOIN servicos s ON a.servico_id = s.id
       WHERE a.prestador_id = $1
       ORDER BY a.data_agendamento DESC, a.hora_agendamento DESC`,
      [prestadorId]
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar agendamentos do prestador:', err.message);
    res.status(500).json({ erro: 'Erro ao carregar agendamentos.' });
  }
});

// GET /agendamentos/cliente/:clienteId - Histórico do cliente
app.get('/agendamentos/cliente/:clienteId', async (req, res) => {
  try {
    const clienteId = parseInt(req.params.clienteId, 10);

    const resultado = await db.query(
      `SELECT a.id, a.data_agendamento AS data, a.hora_agendamento AS hora, a.status,
              p.nome_completo AS "nomePrestador",
              s.titulo AS "tituloServico"
       FROM agendamentos a
       JOIN usuarios p ON a.prestador_id = p.id
       JOIN servicos s ON a.servico_id = s.id
       WHERE a.cliente_id = $1
       ORDER BY a.data_agendamento DESC, a.hora_agendamento DESC`,
      [clienteId]
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar histórico do cliente:', err.message);
    res.status(500).json({ erro: 'Erro ao carregar histórico.' });
  }
});

// PATCH /agendamentos/:id/status - Aceitar/Recusar
app.patch('/agendamentos/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ erro: 'Status deve ser informado.' });
    }

    await db.query(
      `UPDATE agendamentos SET status = $1 WHERE id = $2`,
      [status, parseInt(id, 10)]
    );

    res.json({ mensagem: `Status atualizado para ${status}.` });
  } catch (err) {
    console.error('Erro ao atualizar status:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar status.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});