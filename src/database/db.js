const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'agendamento',
  password: 'isacjean2026ifsp@',
  port: 5432,
  client_encoding: 'UTF8' // Força a comunicação com o PostgreSQL em UTF-8
});

// Garante que toda nova conexão do pool force o encoding UTF-8
pool.on('connect', (client) => {
  client.query("SET NAMES 'utf8'");
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};