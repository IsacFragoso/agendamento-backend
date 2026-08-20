// src/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para a conexão SSL do Supabase
  }
});

pool.on('connect', () => {
  console.log('Conectado ao banco de dados PostgreSQL (Supabase) com sucesso!');
});

module.exports = pool;