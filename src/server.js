const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// RF08 - Cálculo de distância (Haversine)
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

// RF01 - Cadastro
app.post('/usuarios', async (req, res) => {
  try {
    const { nome_completo, email, telefone, senha, tipo_conta } = req.body;
    const result = await db.query(
      `INSERT INTO usuarios (nome_completo, email, telefone, senha, tipo_conta) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome_completo, email, telefone, tipo_conta`,
      [nome_completo, email, telefone, senha, tipo_conta]
    );
    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!", usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// RF02 - Login
app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const result = await db.query(
      'SELECT id, nome_completo, email, tipo_conta, foto_perfil, status_identidade, rua, numero, bairro, cidade, latitude, longitude FROM usuarios WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensagem: "E-mail ou senha incorretos." });
    }

    res.json({ mensagem: "Login realizado com sucesso!", usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT id, nome_completo, email, tipo_conta FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// RF07 - Validação de Identidade e Endereço
app.patch('/usuarios/:id/identidade', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { fotoPerfil, documentoIdentidade, rua, numero, bairro, cidade, lat, lng } = req.body;

    const result = await db.query(
      `UPDATE usuarios 
       SET foto_perfil = COALESCE($1, foto_perfil),
           documento_identidade = COALESCE($2, documento_identidade),
           status_identidade = CASE WHEN $2 IS NOT NULL THEN 'Verificado'::status_identidade_enum ELSE status_identidade END,
           rua = COALESCE($3, rua),
           numero = COALESCE($4, numero),
           bairro = COALESCE($5, bairro),
           cidade = COALESCE($6, cidade),
           latitude = COALESCE($7, latitude),
           longitude = COALESCE($8, longitude)
       WHERE id = $9 RETURNING *`,
      [fotoPerfil, documentoIdentidade, rua, numero, bairro, cidade, lat ? parseFloat(lat) : null, lng ? parseFloat(lng) : null, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ mensagem: "Usuário não encontrado." });

    res.json({ mensagem: "Perfil e endereço atualizados com sucesso!", usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// RF03 - Portfólio
app.post('/servicos', async (req, res) => {
  try {
    const { titulo, descricao, preco, prestadorId } = req.body;
    const result = await db.query(
      'INSERT INTO servicos (titulo, descricao, preco, prestador_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [titulo, descricao, parseFloat(preco), parseInt(prestadorId, 10)]
    );
    res.status(201).json({ mensagem: "Serviço cadastrado!", servico: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/servicos', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.id, s.titulo, s.descricao, s.preco, s.prestador_id AS "prestadorId", u.nome_completo AS "nomePrestador" 
       FROM servicos s 
       JOIN usuarios u ON s.prestador_id = u.id`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/servicos/:prestadorId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM servicos WHERE prestador_id = $1', [parseInt(req.params.prestadorId, 10)]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/servicos/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM servicos WHERE id = $1', [parseInt(req.params.id, 10)]);
    res.json({ mensagem: "Serviço removido!" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// RF04 - Agenda do Prestador
app.post('/agenda', async (req, res) => {
  try {
    const { prestadorId, dia, horaInicio, horaFim } = req.body;
    const result = await db.query(
      `INSERT INTO agendas (prestador_id, dia_semana, hora_inicio, hora_fim)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (prestador_id, dia_semana) 
       DO UPDATE SET hora_inicio = EXCLUDED.hora_inicio, hora_fim = EXCLUDED.hora_fim
       RETURNING id, prestador_id AS "prestadorId", dia_semana AS "dia", hora_inicio AS "horaInicio", hora_fim AS "horaFim"`,
      [parseInt(prestadorId, 10), dia, horaInicio, horaFim]
    );
    res.status(201).json({ mensagem: `Horário de ${dia} configurado!`, agenda: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/agenda/:prestadorId/:dia', async (req, res) => {
  try {
    await db.query('DELETE FROM agendas WHERE prestador_id = $1 AND dia_semana = $2', [parseInt(req.params.prestadorId, 10), req.params.dia]);
    res.json({ mensagem: `Horário de ${req.params.dia} removido!` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/agenda/:prestadorId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT dia_semana AS "dia", hora_inicio AS "horaInicio", hora_fim AS "horaFim" FROM agendas WHERE prestador_id = $1',
      [parseInt(req.params.prestadorId, 10)]
    );
    res.json({ prestadorId: parseInt(req.params.prestadorId, 10), horariosPorDia: result.rows });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// RF05 - Solicitação de Agendamentos
app.post('/agendamentos', async (req, res) => {
  try {
    const { clienteId, servicoId, prestadorId, data, hora } = req.body;
    const result = await db.query(
      `INSERT INTO agendamentos (cliente_id, prestador_id, servico_id, data_agendamento, hora_agendamento)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [parseInt(clienteId, 10), parseInt(prestadorId, 10), parseInt(servicoId, 10), data, hora]
    );
    res.status(201).json({ mensagem: "Agendamento solicitado com sucesso!", agendamento: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/agendamentos/cliente/:clienteId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        a.id, 
        a.data_agendamento AS data, 
        a.hora_agendamento AS hora, 
        a.status, 
        s.titulo AS "tituloServico", 
        s.preco AS "precoServico", 
        u.nome_completo AS "nomePrestador"
       FROM agendamentos a
       JOIN servicos s ON a.servico_id = s.id
       JOIN usuarios u ON a.prestador_id = u.id
       WHERE a.cliente_id = $1
       ORDER BY a.id DESC`,
      [parseInt(req.params.clienteId, 10)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro no GET /agendamentos/cliente:", err.message);
    res.status(500).json({ erro: err.message });
  }
});

// RF06 - Gerenciamento de Agendamentos pelo Prestador (CORRIGIDO)
app.get('/agendamentos/prestador/:prestadorId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        a.id,
        a.data_agendamento AS data,
        a.hora_agendamento AS hora,
        a.status,
        u.nome_completo AS "nomeCliente",
        s.titulo AS "tituloServico",
        s.preco AS "precoServico"
       FROM agendamentos a
       JOIN usuarios u ON a.cliente_id = u.id
       JOIN servicos s ON a.servico_id = s.id
       WHERE a.prestador_id = $1
       ORDER BY a.id DESC`,
      [parseInt(req.params.prestadorId, 10)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro no GET /agendamentos/prestador:", err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.patch('/agendamentos/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    const result = await db.query(
      'UPDATE agendamentos SET status = $1::status_agendamento_enum WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ mensagem: "Agendamento não encontrado." });

    res.json({ mensagem: `Agendamento ${status.toLowerCase()} com sucesso!`, agendamento: result.rows[0] });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// RF08 - Consulta de Distância
app.get('/agendamentos/:id/distancia', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await db.query(
      `SELECT a.id, 
              c.rua AS cliente_rua, c.numero AS cliente_num, c.bairro AS cliente_bairro, c.cidade AS cliente_cidade, c.latitude AS cliente_lat, c.longitude AS cliente_lng,
              p.rua AS prestador_rua, p.numero AS prestador_num, p.bairro AS prestador_bairro, p.cidade AS prestador_cidade, p.latitude AS prestador_lat, p.longitude AS prestador_lng
       FROM agendamentos a
       JOIN usuarios c ON a.cliente_id = c.id
       JOIN usuarios p ON a.prestador_id = p.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ mensagem: "Agendamento não encontrado." });

    const row = result.rows[0];
    if (!row.cliente_lat || !row.prestador_lat) {
      return res.status(400).json({ mensagem: "Coordenadas lat/lng ausentes para cliente ou prestador." });
    }

    const distanciaKm = calcularDistanciaKm(
      parseFloat(row.cliente_lat), parseFloat(row.cliente_lng),
      parseFloat(row.prestador_lat), parseFloat(row.prestador_lng)
    );

    res.json({
      agendamentoId: id,
      origem: { rua: row.cliente_rua, numero: row.cliente_num, bairro: row.cliente_bairro, cidade: row.cliente_cidade },
      destino: { rua: row.prestador_rua, numero: row.prestador_num, bairro: row.prestador_bairro, cidade: row.prestador_cidade },
      distanciaKm: `${distanciaKm} km`,
      linkGoogleMaps: `https://www.google.com/maps/dir/?api=1&origin=${row.cliente_lat},${row.cliente_lng}&destination=${row.prestador_lat},${row.prestador_lng}`
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(8000, () => console.log('Servidor rodando na porta 8000 conectado ao PostgreSQL!'));