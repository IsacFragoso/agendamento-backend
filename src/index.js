const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let usuarios = [];
let servicos = []; 
let agendas = []; 
let agendamentos = [];

// Função auxiliar RF08: Cálculo de distância usando a Fórmula de Haversine
function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Raio da Terra em km
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
app.post('/usuarios', (req, res) => {
    const { nome_completo, email, telefone, senha, tipo_conta } = req.body;
    const novoUsuario = { 
        id: usuarios.length + 1, 
        nome_completo, 
        email, 
        telefone, 
        senha, 
        tipo_conta,
        fotoPerfil: null,
        documentoIdentidade: null,
        statusIdentidade: 'Pendente',
        endereco: null
    };
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
            tipo_conta: usuarioEncontrado.tipo_conta,
            fotoPerfil: usuarioEncontrado.fotoPerfil,
            statusIdentidade: usuarioEncontrado.statusIdentidade,
            endereco: usuarioEncontrado.endereco
        }
    });
});

app.get('/usuarios', (req, res) => res.json(usuarios));

// RF07 - Validação de Identidade, Foto de Perfil e Endereço
app.patch('/usuarios/:id/identidade', (req, res) => {
    const id = parseInt(req.params.id);
    const { fotoPerfil, documentoIdentidade, rua, numero, bairro, cidade, lat, lng } = req.body;

    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return res.status(404).json({ mensagem: "Usuário não encontrado." });

    if (fotoPerfil) usuario.fotoPerfil = fotoPerfil;
    if (documentoIdentidade) {
        usuario.documentoIdentidade = documentoIdentidade;
        usuario.statusIdentidade = 'Verificado';
    }
    if (rua || lat) {
        usuario.endereco = { 
            rua: rua || '', 
            numero: numero || '', 
            bairro: bairro || '', 
            cidade: cidade || '', 
            lat: lat ? parseFloat(lat) : null, 
            lng: lng ? parseFloat(lng) : null 
        };
    }

    res.json({ mensagem: "Perfil e endereço atualizados com sucesso!", usuario });
});

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

// RF06 - Gerenciamento de Agendamentos pelo Prestador
app.get('/agendamentos/prestador/:prestadorId', (req, res) => {
    res.json(agendamentos.filter(a => a.prestadorId === parseInt(req.params.prestadorId)));
});

app.patch('/agendamentos/:id/status', (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const agendamento = agendamentos.find(a => a.id === id);

    if (!agendamento) {
        return res.status(404).json({ mensagem: "Agendamento não encontrado." });
    }

    agendamento.status = status;
    res.json({ mensagem: `Agendamento ${status.toLowerCase()} com sucesso!`, agendamento });
});

// RF08 - Consulta de Distância entre Cliente e Prestador no Agendamento
app.get('/agendamentos/:id/distancia', (req, res) => {
    const id = parseInt(req.params.id);
    const agendamento = agendamentos.find(a => a.id === id);
    if (!agendamento) return res.status(404).json({ mensagem: "Agendamento não encontrado." });

    const cliente = usuarios.find(u => u.id === agendamento.clienteId);
    const prestador = usuarios.find(u => u.id === agendamento.prestadorId);

    if (!cliente?.endereco?.lat || !prestador?.endereco?.lat) {
        return res.status(400).json({ mensagem: "Endereço ou coordenadas de lat/lng do cliente ou prestador ausentes." });
    }

    const distanciaKm = calcularDistanciaKm(
        cliente.endereco.lat, cliente.endereco.lng,
        prestador.endereco.lat, prestador.endereco.lng
    );

    res.json({
        agendamentoId: id,
        origem: cliente.endereco,
        destino: prestador.endereco,
        distanciaKm: `${distanciaKm} km`,
        linkGoogleMaps: `https://www.google.com/maps/dir/?api=1&origin=${cliente.endereco.lat},${cliente.endereco.lng}&destination=${prestador.endereco.lat},${prestador.endereco.lng}`
    });
});

app.listen(8000, () => console.log('Servidor rodando na porta 8000'));