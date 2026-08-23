const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let usuarios = [];
let servicos = []; 
let agendas = []; // Armazena a agenda customizada por dia do prestador

// RF01 - Cadastro
app.post('/usuarios', (req, res) => {
    const { nome_completo, email, telefone, senha, tipo_conta } = req.body;
    const novoUsuario = { id: usuarios.length + 1, nome_completo, email, telefone, senha, tipo_conta };
    usuarios.push(novoUsuario);
    res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!", usuario: novoUsuario });
});

// RF02 - Login
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    const usuarioEncontrado = usuarios.find(u => u.email === email && u.senha === senha);

    if (!usuarioEncontrado) {
        return res.status(401).json({ mensagem: "E-mail ou senha incorretos." });
    }

    res.json({
        mensagem: "Login realizado com sucesso!",
        usuario: {
            id: usuarioEncontrado.id,
            nome_completo: usuarioEncontrado.nome_completo,
            email: usuarioEncontrado.email,
            tipo_conta: usuarioEncontrado.tipo_conta
        }
    });
});

app.get('/usuarios', (req, res) => res.json(usuarios));

// RF03 - Servicos (Portfólio)
app.post('/servicos', (req, res) => {
    const { titulo, descricao, preco, prestadorId } = req.body;
    const novoServico = { id: servicos.length + 1, titulo, descricao, preco, prestadorId };
    servicos.push(novoServico);
    res.status(201).json({ mensagem: "Serviço cadastrado no portfólio!", servico: novoServico });
});

app.get('/servicos/:prestadorId', (req, res) => {
    const { prestadorId } = req.params;
    const meusServicos = servicos.filter(s => s.prestadorId === parseInt(prestadorId));
    res.json(meusServicos);
});

app.delete('/servicos/:id', (req, res) => {
    const { id } = req.params;
    servicos = servicos.filter(s => s.id !== parseInt(id));
    res.json({ mensagem: "Serviço removido com sucesso!" });
});

// --- RF04: AGENDA CUSTOMIZADA POR DIA DA SEMANA ---

// Salvar ou atualizar configuração de dia específico
app.post('/agenda', (req, res) => {
    const { prestadorId, dia, horaInicio, horaFim } = req.body;

    // Busca agenda existente do prestador ou cria uma nova
    let agendaPrestador = agendas.find(a => a.prestadorId === parseInt(prestadorId));

    if (!agendaPrestador) {
        agendaPrestador = { prestadorId: parseInt(prestadorId), horariosPorDia: [] };
        agendas.push(agendaPrestador);
    }

    // Remove o dia se ele já tiver sido configurado anteriormente
    agendaPrestador.horariosPorDia = agendaPrestador.horariosPorDia.filter(h => h.dia !== dia);

    // Adiciona o novo intervalo para o dia informado
    agendaPrestador.horariosPorDia.push({ dia, horaInicio, horaFim });

    res.status(201).json({ mensagem: `Horário de ${dia} configurado com sucesso!`, agenda: agendaPrestador });
});

// Remover a configuração de um dia específico
app.delete('/agenda/:prestadorId/:dia', (req, res) => {
    const { prestadorId, dia } = req.params;
    const agendaPrestador = agendas.find(a => a.prestadorId === parseInt(prestadorId));

    if (agendaPrestador) {
        agendaPrestador.horariosPorDia = agendaPrestador.horariosPorDia.filter(h => h.dia !== dia);
    }

    res.json({ mensagem: `Horário de ${dia} removido com sucesso!` });
});

// Buscar agenda completa do prestador
app.get('/agenda/:prestadorId', (req, res) => {
    const { prestadorId } = req.params;
    const agendaPrestador = agendas.find(a => a.prestadorId === parseInt(prestadorId));
    res.json(agendaPrestador || { prestadorId: parseInt(prestadorId), horariosPorDia: [] });
});

app.listen(8000, () => console.log('Servidor rodando na porta 8000'));