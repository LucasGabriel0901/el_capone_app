const API_URL = "http://127.0.0.1:5000/api";

// Executa ao carregar a página: Verifica se o barbeiro já estava logado antes
document.addEventListener('DOMContentLoaded', () => {
    const colabId = localStorage.getItem('colaborador_id');
    if (colabId) {
        exibirPainelDashboard();
    }
});

// Alterna visualmente entre as caixas de Login e Cadastro
function alternarTelaAdmin(tela) {
    const loginDiv = document.getElementById('adminLogin');
    const cadastroDiv = document.getElementById('adminCadastro');
    const titulo = document.getElementById('adminAuthTitle');

    if (tela === 'cadastro') {
        loginDiv.style.display = 'none';
        cadastroDiv.style.display = 'block';
        titulo.innerText = "CADASTRAR COLABORADOR";
    } else {
        loginDiv.style.display = 'block';
        cadastroDiv.style.display = 'none';
        titulo.innerText = "LOGIN COLABORADOR";
    }
}

// 🔐 ENVIA O CADASTRO DO BARBEIRO PARA A API
async function cadastrarColaborador() {
    const payload = {
        nome: document.getElementById('adminNome').value.trim(),
        cargo: document.getElementById('adminCargo').value.trim(),
        cpf: document.getElementById('adminCPF').value.trim(),
        email: document.getElementById('adminEmail').value.trim(),
        senha: document.getElementById('adminNewPass').value,
        codigo_autorizacao: document.getElementById('adminCodigoMestre').value.trim()
    };

    if (!payload.nome || !payload.cargo || !payload.cpf || !payload.email || !payload.senha || !payload.codigo_autorizacao) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/colaboradores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();
        alert(dados.mensagem);

        if (resposta.ok) {
            alternarTelaAdmin('login'); // Manda para o login para testar o acesso
        }
    } catch (erro) {
        alert("Erro ao conectar com o back-end.");
        console.error(erro);
    }
}

// 🔐 REALIZA O LOGIN DO COLABORADOR
async function entrarPainelAdmin() {
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value;

    if (!user || !pass) {
        alert("Preencha o usuário e a senha.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/colaborador/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginUser: user, senha: pass })
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            // Guarda na memória do navegador quem está trabalhando
            localStorage.setItem('colaborador_id', dados.colaborador.id);
            localStorage.setItem('colaborador_nome', dados.colaborador.nome);
            
            exibirPainelDashboard();
        } else {
            alert("Erro: " + dados.mensagem);
        }
    } catch (erro) {
        alert("Erro de conexão com o servidor.");
        console.error(erro);
    }
}

// Controla a transição visual da autenticação para o Dashboard interno
function exibirPainelDashboard() {
    document.getElementById('adminAuth').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    // Atualiza o logo ou título com o nome do profissional logado
    const nomeBarbeiro = localStorage.getItem('colaborador_nome');
    document.querySelector('.logo').innerText = `EL CAPONE - ADMIN (${nomeBarbeiro})`;
    
    // Carrega automaticamente a lista filtrada de cortes dele
    carregarAgendaDoBarbeiro();
}

// 🎯 BUSCA DO BANCO E SEPARA PENDENTES DE CONCLUÍDOS
async function carregarAgendaDoBarbeiro() {
    const colabId = localStorage.getItem('colaborador_id');
    const tabelaPendentes = document.getElementById('tabelaAgenda');
    const tabelaHistorico = document.getElementById('tabelaHistorico');
    
    if (!colabId || !tabelaPendentes) return;

    try {
        const resposta = await fetch(`${API_URL}/colaborador/agendamentos/${colabId}`);
        const agendamentos = await resposta.json(); 

        tabelaPendentes.innerHTML = '';
        if(tabelaHistorico) tabelaHistorico.innerHTML = '';

        // Filtra as listas
        const pendentes = agendamentos.filter(a => a.status === 'Pendente');
        const historico = agendamentos.filter(a => a.status !== 'Pendente');

        // 1. RENDERIZA OS PENDENTES (Agora com o botão de EDITAR)
        if (pendentes.length === 0) {
            tabelaPendentes.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #888;">Nenhum agendamento pendente.</td></tr>`;
        } else {
            pendentes.forEach(agenda => {
                const linha = document.createElement('tr');
                linha.innerHTML = `
                    <td><b>${agenda.cliente_nome}</b><br><small style="color: #888;">${agenda.cliente_telefone}</small></td>
                    <td><span class="badge-servico">${agenda.servico_nome}</span></td>
                    <td>${localStorage.getItem('colaborador_nome')}</td>
                    <td>${agenda.hora} - ${agenda.data}</td>
                    <td><span style="color: #d4af37; font-weight: bold;">⏳ ${agenda.status}</span></td>
                    <td style="display: flex; gap: 10px; align-items: center; border: none;">
                        <button class="btn-detalhes" onclick="abrirModalEdicao(${agenda.id}, '${agenda.data}', '${agenda.hora}')">EDITAR</button>
                        <button class="btn-dourado-full" style="padding: 5px 10px; font-size: 11px; width: auto; margin: 0;" onclick="concluirAgendamento(${agenda.id})">CONCLUIR</button>
                    </td>
                `;
                tabelaPendentes.appendChild(linha);
            });
        }

        // 2. RENDERIZA O HISTÓRICO (Concluídos e Cancelados)
        if (tabelaHistorico) {
            if (historico.length === 0) {
                tabelaHistorico.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">Nenhum histórico registrado.</td></tr>`;
            } else {
                historico.forEach(agenda => {
                    const corStatus = agenda.status === 'Concluído' ? '#25d366' : '#ff4444';
                    const icone = agenda.status === 'Concluído' ? '✅' : '❌';

                    const linha = document.createElement('tr');
                    linha.innerHTML = `
                        <td><b>${agenda.cliente_nome}</b><br><small style="color: #888;">${agenda.cliente_telefone}</small></td>
                        <td><span class="badge-servico">${agenda.servico_nome}</span></td>
                        <td>${localStorage.getItem('colaborador_nome')}</td>
                        <td>${agenda.hora} - ${agenda.data}</td>
                        <td><span style="color: ${corStatus}; font-weight: bold;">${icone} ${agenda.status}</span></td>
                    `;
                    tabelaHistorico.appendChild(linha);
                });
            }
        }

    } catch (erro) {
        console.error("Erro ao carregar agendamentos:", erro);
    }
}
// Altera entre as abas internas do painel administrativo
function mostrarSecao(secaoId, botao) {
    // Esconde todas as seções
    document.querySelectorAll('.painel-section').forEach(sec => sec.style.display = 'none');
    // Remove a classe ativa dos botões do menu
    document.querySelectorAll('.navbar nav a').forEach(a => a.classList.remove('ativo'));
    
    // Exibe a seção clicada e ativa o botão
    document.getElementById(secaoId).style.display = 'block';
    botao.classList.add('ativo');

    if (secaoId === 'agenda-dia') {
        carregarAgendaDoBarbeiro();
    }
}
// ✅ MARCA O CORTE COMO CONCLUÍDO NO BANCO DE DADOS
async function concluirAgendamento(id) {
    if (confirm("Deseja marcar este serviço como concluído?")) {
        try {
            const resposta = await fetch(`${API_URL}/agendamentos/${id}/concluir`, { method: 'PUT' });
            const dados = await resposta.json();
            
            alert(dados.mensagem);
            if (resposta.ok) {
                carregarAgendaDoBarbeiro(); // Atualiza a tabela tirando o corte da tela
                carregarMetricasFinanceiras(); // Atualiza o faturamento na mesma hora!
            }
        } catch (erro) {
            console.error("Erro ao concluir:", erro);
        }
    }
}
// 🔍 BUSCA COM FEEDBACK VISUAL
async function buscarCliente() {
    const termo = document.getElementById('buscaCliente').value.trim();
    const div = document.getElementById('resultadoBusca');
    
    if (termo.length < 3) {
        div.innerHTML = '<p style="color: #555;">Use a busca acima para encontrar um cliente.</p>';
        return;
    }

    // Dá um feedback visual para você saber que a função disparou
    div.innerHTML = '<p style="color: #d4af37; font-family: Oswald;">Buscando na base de dados...</p>';

    try {
        const resposta = await fetch(`${API_URL}/clientes/busca?termo=${termo}`);
        const clientes = await resposta.json();

        if (clientes.length === 0) {
            div.innerHTML = '<p style="color: #ff4444; font-size: 14px;">Nenhum cliente encontrado com este dado.</p>';
            return;
        }

        // Se achar, desenha os cards bonitos
        div.innerHTML = '';
        clientes.forEach(c => {
            div.innerHTML += `
                <div style="background:#111; padding:15px; margin-bottom:10px; border-left:3px solid #d4af37; border-radius: 4px;">
                    <h3 style="color: #d4af37; margin: 0 0 8px 0; font-family: 'Oswald', sans-serif;">${c.nome.toUpperCase()}</h3>
                    <div style="font-size: 13px; color: #ccc; line-height: 1.6;">
                        <p style="margin: 2px 0;"><b>CPF:</b> ${c.cpf}</p>
                        <p style="margin: 2px 0;"><b>Email:</b> ${c.email}</p>
                        <p style="margin: 2px 0;"><b>WhatsApp:</b> ${c.telefone}</p>
                        <p style="margin: 2px 0;"><b>Nascimento:</b> ${c.data_nascimento}</p>
                    </div>
                </div>
            `;
        });
    } catch (erro) {
        console.error("Erro na busca:", erro);
        div.innerHTML = '<p style="color: #ff4444;">Erro ao conectar com o servidor.</p>';
    }
}

function abrirModalEdicao(id, data, hora) {
    document.getElementById('editAgendamentoId').value = id;
    
    // Converte a data de DD/MM/YY de volta para YYYY-MM-DD para o input reconhecer
    const partes = data.split('/');
    const dataISO = `20${partes[2]}-${partes[Partes[1]]}-${partes[0]}`;
    
    document.getElementById('editData').value = dataISO;
    document.getElementById('editHora').value = hora;
    document.getElementById('modalEditarAgendamento').style.display = 'flex';
}

function fecharModalEdicao() {
    document.getElementById('modalEditarAgendamento').style.display = 'none';
}

async function salvarEdicaoAgendamento() {
    const id = document.getElementById('editAgendamentoId').value;
    const novaData = document.getElementById('editData').value;
    const novaHora = document.getElementById('editHora').value;

    if (!novaData || !novaHora) {
        alert("Preencha a data e o horário.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/agendamentos/${id}/editar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: novaData, hora: novaHora })
        });

        const dados = await resposta.json();
        alert(dados.mensagem);

        if (resposta.ok) {
            fecharModalEdicao();
            carregarAgendaDoBarbeiro(); // Recarrega a tabela com o novo horário
        }
    } catch (erro) {
        console.error("Erro ao editar:", erro);
        alert("Erro de conexão com o servidor.");
    }
}

// =========================================
// GESTÃO DE DISPONIBILIDADE (BLOQUEIOS E EXTRAS)
// =========================================

async function carregarDisponibilidadeDoDia() {
    const dataSelecionada = document.getElementById('dataGestaoAgenda').value;
    const colabId = localStorage.getItem('colaborador_id');
    const grid = document.getElementById('gridGestaoHorarios');

    if (!dataSelecionada || !colabId) return;

    grid.innerHTML = '<p style="color: #d4af37;">Carregando horários...</p>';

    try {
        const resposta = await fetch(`${API_URL}/admin/disponibilidade/${colabId}/${dataSelecionada}`);
        const horarios = await resposta.json();

        grid.innerHTML = '';
        horarios.forEach(slot => {
            const btn = document.createElement('button');
            btn.innerText = slot.hora;
            btn.style.padding = "10px";
            btn.style.border = "1px solid #333";
            btn.style.borderRadius = "4px";
            btn.style.fontWeight = "bold";
            btn.style.cursor = "pointer";

            if (slot.estado === 'Ocupado') {
                btn.style.backgroundColor = "#4a1515"; // Vermelho escuro
                btn.style.color = "#ff8888";
                btn.innerText += "\n(Ocupado)";
                btn.disabled = true; // Não pode bloquear se já tem cliente
            } else if (slot.estado === 'Bloqueado') {
                btn.style.backgroundColor = "#222"; // Cinza
                btn.style.color = "#777";
                btn.onclick = () => alternarBloqueioHorario(dataSelecionada, slot.hora, 'Livre');
            } else {
                btn.style.backgroundColor = "#154a1f"; // Verde escuro
                btn.style.color = "#88ff99";
                btn.onclick = () => alternarBloqueioHorario(dataSelecionada, slot.hora, 'Bloqueado');
            }
            grid.appendChild(btn);
        });
    } catch (erro) {
        grid.innerHTML = '<p style="color: #ff4444;">Erro ao carregar agenda.</p>';
    }
}

async function alternarBloqueioHorario(data, hora, novoEstado) {
    const colabId = localStorage.getItem('colaborador_id');
    try {
        await fetch(`${API_URL}/admin/disponibilidade/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ colabId, data, hora, estado: novoEstado })
        });
        carregarDisponibilidadeDoDia(); // Recarrega a tela na hora para piscar a nova cor
    } catch (erro) {
        alert("Erro ao alterar horário.");
    }
}

async function adicionarHorarioExtra() {
    const dataSelecionada = document.getElementById('dataGestaoAgenda').value;
    const horaExtra = document.getElementById('novoHorarioExtra').value;
    const colabId = localStorage.getItem('colaborador_id');

    if (!dataSelecionada || !horaExtra) {
        alert("Escolha a data no calendário acima e digite a hora extra.");
        return;
    }

    try {
        await fetch(`${API_URL}/admin/disponibilidade/extra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ colabId, data: dataSelecionada, hora: horaExtra })
        });
        document.getElementById('novoHorarioExtra').value = ""; // Limpa o campo
        carregarDisponibilidadeDoDia(); // Atualiza a grade
    } catch (erro) {
        alert("Erro ao adicionar hora extra.");
    }
}


function sairPainelAdmin() {
    localStorage.clear();
    window.location.reload();
}


async function carregarAnalise() {
    const mes = document.getElementById('analiseMes').value;
    const ano = document.getElementById('analiseAno').value;
    const grid = document.getElementById('gridMetricas');

    if (!mes || !ano) return;
    grid.innerHTML = '<p style="color: #d4af37;">Calculando indicadores...</p>';

    try {
        const resposta = await fetch(`${API_URL}/analises/agendamentos?mes=${mes}&ano=${ano}`);
        const metricas = await resposta.json();

        grid.innerHTML = `
            <div style="background:#151515; border:1px solid #333; padding:20px; border-radius:4px; text-align:center;">
                <h4 style="color:#888; font-family:'Oswald'; margin-bottom:10px;">TOTAL AGENDAMENTOS</h4>
                <p style="color:#fff; font-size:24px; font-weight:bold;">${metricas.total}</p>
            </div>
            <div style="background:#151515; border:1px solid #25d366; padding:20px; border-radius:4px; text-align:center;">
                <h4 style="color:#25d366; font-family:'Oswald'; margin-bottom:10px;">CONCLUÍDOS</h4>
                <p style="color:#fff; font-size:24px; font-weight:bold;">${metricas.concluidos} <small style="font-size:12px;">(${metricas.pct_concluido}%)</small></p>
            </div>
            <div style="background:#151515; border:1px solid #ff4444; padding:20px; border-radius:4px; text-align:center;">
                <h4 style="color:#ff4444; font-family:'Oswald'; margin-bottom:10px;">CANCELADOS</h4>
                <p style="color:#fff; font-size:24px; font-weight:bold;">${metricas.cancelados} <small style="font-size:12px;">(${metricas.pct_cancelado}%)</small></p>
            </div>
            <div style="background:#151515; border:1px solid #d4af37; padding:20px; border-radius:4px; text-align:center;">
                <h4 style="color:#d4af37; font-family:'Oswald'; margin-bottom:10px;">AGENDADOS (FUTUROS)</h4>
                <p style="color:#fff; font-size:24px; font-weight:bold;">${metricas.agendados}</p>
            </div>
            <div style="background:#151515; border:1px solid #333; padding:20px; border-radius:4px; text-align:center;">
                <h4 style="color:#888; font-family:'Oswald'; margin-bottom:10px;">VALOR PREVISTO</h4>
                <p style="color:#fff; font-size:24px; font-weight:bold;">R$ ${metricas.valor_previsto.toFixed(2)}</p>
            </div>
            <div style="background:#151515; border:1px solid #25d366; padding:20px; border-radius:4px; text-align:center;">
                <h4 style="color:#25d366; font-family:'Oswald'; margin-bottom:10px;">VALOR CONCLUÍDO</h4>
                <p style="color:#fff; font-size:24px; font-weight:bold;">R$ ${metricas.valor_concluido.toFixed(2)}</p>
            </div>
            <div style="background:#151515; border:1px solid #ff4444; padding:20px; border-radius:4px; text-align:center;">
                <h4 style="color:#ff4444; font-family:'Oswald'; margin-bottom:10px;">VALOR PERDIDO</h4>
                <p style="color:#fff; font-size:24px; font-weight:bold;">R$ ${metricas.valor_perdido.toFixed(2)}</p>
            </div>
        `;
    } catch (erro) {
        grid.innerHTML = '<p style="color: #ff4444;">Erro ao carregar dados analíticos.</p>';
    }
}

