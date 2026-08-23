const express = require('express');
const cors = require('cors'); // <-- Importação do CORS

const app = express();

// Permite a comunicação com o React (CORS) e o uso de JSON
app.use(cors()); // <-- Liberação do CORS no topo!
app.use(express.json());

// Nosso "banco de dados" temporário em memória
let usuarios = [];

// Rota POST para simular o Cadastro de Usuários (RF01)
app.post('/usuarios', (req, res) => {
    const { nome_completo, email, tipo_conta } = req.body;
    
    const novoUsuario = {
        id: usuarios.length + 1,
        nome_completo,
        email,
        tipo_conta
    };

    usuarios.push(novoUsuario);
    
    // Retorna sucesso e o usuário criado
    res.status(201).json({ 
        mensagem: "Usuário cadastrado com sucesso!", 
        usuario: novoUsuario 
    });
});

// Rota GET para listar os usuários cadastrados
app.get('/usuarios', (req, res) => {
    res.json(usuarios);
});

// Inicia o servidor
app.listen(8000, () => {
    console.log('Servidor rodando na porta 8000');
});