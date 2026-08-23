const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let usuarios = [];
let servicos = []; 
let agendas = []; 
let agendamentos = [];

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

// RF03 - Portfólio
app.post('/servicos', (req, res) => {
    const { titulo, descricao, preco, prestadorId } = req.body;
    const novoServico = { id: servicos.length + 1, titulo, descricao, preco: parseFloat(preco), prestadorId: parseInt(prestadorId) };
    servicos.push(novoServico);
    res.status(201).json({ mensagem: "Serviço cadastrado!", servico: novoServico });
});

app.get('/servicos', (req, res) => {
    const servicosComPrestador = servicos.map(s => {
        const prestador = usuarios.find(u => u.id === s.prestadorId);
        return { ...s, nomePrestador: prestador ? prestador.nome_completo : 'Prestador' };
    });
    res.json(servicosComPrestador);
});

app.get('/servicos/:prestadorId', (req, res) => {
    const { prestadorId } = req.params;
    res.json(servicos.filter(s => s.prestadorId === parseInt(prestadorId)));
});

app.delete('/servicos/:id', (req, res) => {
    servicos = servicos.filter(s => s.id !== parseInt(req.params.id));
    res.json({ mensagem: "Serviço removido!" });
});

// RF04 - Agenda do Prestador
app.post('/agenda', (req, res) => {
    const { prestadorId, dia, horaInicio, horaFim } = req.body;
    let agendaPrestador = agendas.find(a => a.prestadorId === parseInt(prestadorId));

    if (!agendaPrestador) {
        agendaPrestador = { prestadorId: parseInt(prestadorId), horariosPorDia: [] };
        agendas.push(agendaPrestador);
    }

    agendaPrestador.horariosPorDia = agendaPrestador.horariosPorDia.filter(h => h.dia !== dia);
    agendaPrestador.horariosPorDia.push({ dia, horaInicio, horaFim });

    res.status(201).json({ mensagem: `Horário de ${dia} configurado!`, agenda: agendaPrestador });
});

app.delete('/agenda/:prestadorId/:dia', (req, res) => {
    const { prestadorId, dia } = req.params;
    const agendaPrestador = agendas.find(a => a.prestadorId === parseInt(prestadorId));
    if (agendaPrestador) {
        agendaPrestador.horariosPorDia = agendaPrestador.horariosPorDia.filter(h => h.dia !== dia);
    }
    res.json({ mensagem: `Horário de ${dia} removido!` });
});

app.get('/agenda/:prestadorId', (req, res) => {
    const agendaPrestador = agendas.find(a => a.prestadorId === parseInt(req.params.prestadorId));
    res.json(agendaPrestador || { prestadorId: parseInt(req.params.prestadorId), horariosPorDia: [] });
});

// RF05 - Criar Agendamento e Listar por Cliente
app.post('/agendamentos', (req, res) => {
    const { clienteId, servicoId, prestadorId, data, hora } = req.body;
    const cliente = usuarios.find(u => u.id === parseInt(clienteId));
    const servico = servicos.find(s => s.id === parseInt(servicoId));
    const prestador = usuarios.find(u => u.id === parseInt(prestadorId));

    if (!servico || !cliente) return res.status(400).json({ mensagem: "Dados inválidos." });

    const novoAgendamento = {
        id: agendamentos.length + 1,
        clienteId: parseInt(clienteId),
        nomeCliente: cliente.nome_completo,
        servicoId: parseInt(servicoId),
        tituloServico: servico.titulo,
        precoServico: servico.preco,
        prestadorId: parseInt(prestadorId),
        nomePrestador: prestador ? prestador.nome_completo : 'Prestador',
        data,
        hora,
        status: 'Pendente'
    };

    agendamentos.push(novoAgendamento);
    res.status(201).json({ mensagem: "Agendamento solicitado com sucesso!", agendamento: novoAgendamento });
});

app.get('/agendamentos/cliente/:clienteId', (req, res) => {
    res.json(agendamentos.filter(a => a.clienteId === parseInt(req.params.clienteId)));
});

// --- RF06: GERENCIAMENTO DE AGENDAMENTOS PELO PRESTADOR ---

// Listar solicitações recebidas pelo prestador
app.get('/agendamentos/prestador/:prestadorId', (req, res) => {
    res.json(agendamentos.filter(a => a.prestadorId === parseInt(req.params.prestadorId)));
});

// Alterar status do agendamento (Confirmado / Cancelado)
app.patch('/agendamentos/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Expects 'Confirmado' or 'Cancelado'

    const agendamento = agendamentos.find(a => a.id === parseInt(id));

    if (!agendamento) {
        return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }

    agendamento.status = status;
    res.json({ mensagem: `Agendamento ${status.toLowerCase()} com sucesso!`, agendamento });
});

app.listen(8000, () => console.log('Servidor rodando na porta 8000'));