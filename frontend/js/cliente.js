const API_URL = "http://127.0.0.1:5000/api";
let servicoSelecionado = "";
let horaEscolhida = "";

// =========================================
// 🚀 INICIALIZAÇÃO DA PÁGINA (DOMContentLoaded ÚNICO)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Controle de Segurança e Boas-Vindas
    const nomeCompleto = localStorage.getItem('cliente_nome');
    if (nomeCompleto) {
        document.getElementById('nome-cliente-header').innerText = nomeCompleto;
    } else {
        alert("Acesso não autorizado. Por favor, faça login.");
        window.location.href = "index.html";
        return;
    }

    // 2. Inicializa os recursos visuais e dados do banco
    iniciarBannerRotativo();
    carregarBarbeirosNoModal();
    atualizarListaCliente(); // Mantém o histórico carregando
});

// =========================================
// 🎯 FLUXO DE AGENDAMENTO (CONEXÃO COM O BACK-END)
// =========================================

function abrirAgendamento(servico) {
    servicoSelecionado = servico;
    const titulo = document.getElementById('agendamentoTitulo');
    const modal = document.getElementById('modalAgendamento');
    const secaoHorarios = document.getElementById('secaoHorarios');
    const inputData = document.getElementById('dataAgendamento');
    const selectBarbeiro = document.getElementById('barbeiroAgendamento');

    if (titulo && modal) {
        titulo.innerText = `AGENDAR ${servico.toUpperCase()}`;
        modal.style.display = 'flex'; // Mantém o padrão flex do seu CSS
        if (secaoHorarios) secaoHorarios.style.display = 'none';
        if (inputData) inputData.value = "";
        if (selectBarbeiro) selectBarbeiro.value = ""; // Reseta o barbeiro escolhido
    }
}

function fecharModalAgendamento() {
    const modal = document.getElementById('modalAgendamento');
    if (modal) modal.style.display = 'none';
    horaEscolhida = ""; // Limpa o horário selecionado
}

// Busca os colaboradores cadastrados no banco e joga no select do Modal
async function carregarBarbeirosNoModal() {
    const selectBarbeiro = document.getElementById('barbeiroAgendamento');
    if (!selectBarbeiro) return;

    try {
        const resposta = await fetch(`${API_URL}/colaboradores`);
        const barbeiros = await resposta.json();

        selectBarbeiro.innerHTML = '<option value="">Selecione um Barbeiro</option>';

        barbeiros.forEach(barbeiro => {
            const option = document.createElement('option');
            option.value = barbeiro.id; // Envia o ID para o banco
            option.innerText = `${barbeiro.nome} (${barbeiro.cargo})`; // Exibe o nome para o cliente
            selectBarbeiro.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao carregar barbeiros:", erro);
        selectBarbeiro.innerHTML = '<option value="">Erro ao carregar profissionais</option>';
    }
}

// Monitora se o usuário escolheu o Barbeiro E a Data para liberar os horários
function checarCamposParaCarregarHorarios() {
    const barbeiroId = document.getElementById('barbeiroAgendamento').value;
    const dataEscolhida = document.getElementById('dataAgendamento').value;

    if (barbeiroId && dataEscolhida) {
        carregarHorariosDisponiveis(barbeiroId, dataEscolhida);
    } else {
        const secaoHorarios = document.getElementById('secaoHorarios');
        if (secaoHorarios) secaoHorarios.style.display = 'none';
    }
}

// Renderiza a grade de horários respeitando suas classes CSS (.hora-slot)

// 🎯 CARREGA O GRID DE HORÁRIOS INTELIGENTES DO BACK-END
async function carregarHorariosDisponiveis(barbeiroId, data) {
    const container = document.getElementById('containerHorarios');
    const secao = document.getElementById('secaoHorarios');
    
    if (!container || !secao) return;

    container.innerHTML = "<p style='color: #d4af37; grid-column: 1/-1;'>Calculando disponibilidade...</p>";
    secao.style.display = 'block';

    try {
        // Dispara a pergunta para a nossa nova inteligência no Python
        const resposta = await fetch(`${API_URL}/horarios-disponiveis?colaborador_id=${barbeiroId}&data=${data}`);
        const horariosLivres = await resposta.json();

        container.innerHTML = '';

        if (horariosLivres.length === 0) {
            container.innerHTML = '<p style="color: #ff4444; font-size: 13px; grid-column: 1/-1; text-align: center;">Agenda 100% lotada para este dia.</p>';
            return;
        }

        // Desenha apenas os botões dos horários que passaram no teste do Python
        horariosLivres.forEach(hora => {
            const slot = document.createElement('div');
            slot.innerText = hora;
            slot.className = "hora-slot";
            
            slot.onclick = () => {
                document.querySelectorAll('.hora-slot').forEach(el => el.classList.remove('selecionado'));
                slot.classList.add('selecionado');
                horaEscolhida = hora;
                document.getElementById('btnConfirmarReserva').disabled = false;
            };
            container.appendChild(slot);
        });

    } catch (erro) {
        console.error("Erro ao buscar a inteligência de horários:", erro);
        container.innerHTML = '<p style="color: #ff4444; font-size: 13px; grid-column: 1/-1;">Erro ao carregar a agenda.</p>';
    }
}

async function finalizarAgendamento() {
    const clienteId = localStorage.getItem('cliente_id');
    const barbeiroId = document.getElementById('barbeiroAgendamento').value;
    const dataEscolhida = document.getElementById('dataAgendamento').value;
    const formaPagamento = document.getElementById('formaPagamento').value;

    if (!formaPagamento) {
        alert("Por favor, selecione a forma de pagamento antes de finalizar.");
        return;
    }

    let servicoId = 1; 
    if (servicoSelecionado === 'BARBA') servicoId = 2;
    if (servicoSelecionado === 'CORTE & BARBA') servicoId = 3;
    if (servicoSelecionado === 'LIMPIEZA') servicoId = 4;
    if (servicoSelecionado === 'BOTOX') servicoId = 5;

    const payload = {
        cliente_id: parseInt(clienteId),
        colaborador_id: parseInt(barbeiroId),
        servico_id: servicoId,
        data: dataEscolhida,
        hora: horaEscolhida,
        forma_pagamento: formaPagamento
    };

    try {
        document.getElementById('btnConfirmarReserva').innerText = 'AGUARDE...';
        const resposta = await fetch(`${API_URL}/agendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();
        alert(dados.mensagem);

        if (resposta.ok) {
            fecharModalAgendamento();
            window.location.reload(); 
        } else {
            document.getElementById('btnConfirmarReserva').innerText = 'CONFIRMAR AGENDAMENTO';
        }
    } catch (erro) {
        alert("Erro ao conectar com o servidor.");
        console.error(erro);
    }
}

// =========================================
// 👑 RECURSOS VISUAIS (ABAS, BANNER, MENU)
// =========================================

function trocarAbaCliente(abaId) {
    const abaAgendar = document.getElementById('aba-agendar');
    const abaHistorico = document.getElementById('aba-historico');
    const navAgendar = document.getElementById('nav-agendar');
    const navHistorico = document.getElementById('nav-historico');

    if (!abaAgendar || !abaHistorico) return;

    if (abaId === 'agendar') {
        abaAgendar.style.display = 'block';
        abaHistorico.style.display = 'none';
        navAgendar.classList.add('ativo');
        navHistorico.classList.remove('ativo');
    } else if (abaId === 'historico') {
        abaAgendar.style.display = 'none';
        abaHistorico.style.display = 'block';
        navAgendar.classList.remove('ativo');
        navHistorico.classList.add('ativo');
    }
}

function iniciarBannerRotativo() {
    const bannerContainer = document.querySelector('.banner-promocional');
    if (!bannerContainer) return;
    
    const banners = JSON.parse(localStorage.getItem('banners_capone')) || [];
    if (banners.length === 0) return;

    let index = 0;
    setInterval(() => {
        const b = banners[index];
        bannerContainer.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${b.link}')`;
        bannerContainer.querySelector('h2').innerText = b.titulo;
        
        index = (index + 1) % banners.length;
    }, 5000);
}

function animarMenu(index, elementoAtual) {
    const nav = elementoAtual.parentElement;
    const links = nav.querySelectorAll('a:not(.nav-admin)'); 
    
    links.forEach(link => link.classList.remove('ativo'));
    elementoAtual.classList.add('ativo');
    
    const indicador = nav.querySelector('.indicador-deslizante');
    if (indicador) {
        indicador.style.transform = `translateX(${index * 120}px)`;
    }
}

function irParaPromocao() { alert("Redirecionando para Promoções El Capone..."); }


// =========================================
// ⏳ MEUS AGENDAMENTOS (CONECTADO AO POSTGRESQL)
// =========================================
async function atualizarListaCliente() {
    const listaFuturos = document.getElementById('listaFuturos');
    const listaPassados = document.getElementById('listaPassados');
    const clienteId = localStorage.getItem('cliente_id');

    if (!listaFuturos || !clienteId) return;

    try {
        const resposta = await fetch(`${API_URL}/cliente/agendamentos/${clienteId}`);
        const agendamentos = await resposta.json();

        // Separa o que é futuro do que já passou
        const pendentes = agendamentos.filter(a => a.status === 'Pendente');
        const concluidos = agendamentos.filter(a => a.status !== 'Pendente');

        // Renderiza os pendentes
    
        if (pendentes.length === 0) {
            listaFuturos.innerHTML = "Nenhum agendamento pendente.";
        } else {
            listaFuturos.innerHTML = pendentes.map(a => `
                <div class="item-agendamento" style="border-bottom: 1px solid #222; padding: 15px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #d4af37;">${a.servico}</strong><br>
                        <small style="color: #888;">Dia ${a.data} às ${a.hora}</small>
                    </div>
                    <button class="btn-sair" style="border-color: #ff4444; color: #ff4444; padding: 6px 12px; font-size: 11px;" onclick="cancelarAgendamento(${a.id})">CANCELAR</button>
                </div>
            `).join('');
        }

        // Renderiza o histórico concluído
        if (concluidos.length > 0 && listaPassados) {
            listaPassados.innerHTML = concluidos.map(a => `
                <div style="padding: 10px 0; border-bottom: 1px solid #222;">
                    <strong style="color: #555;">${a.servico}</strong> - <small style="color: #555;">${a.data} às ${a.hora} (${a.status})</small>
                </div>
            `).join('');
        }

    } catch (erro) {
        console.error("Erro ao buscar histórico no banco de dados:", erro);
    }
}

// ❌ CANCELA O CORTE NO BANCO DE DADOS
async function cancelarAgendamento(id) {
    if (confirm("Tem certeza que deseja cancelar este agendamento? O barbeiro será notificado.")) {
        try {
            const resposta = await fetch(`${API_URL}/agendamentos/${id}/cancelar`, { method: 'PUT' });
            const dados = await resposta.json();
            
            alert(dados.mensagem);
            if (resposta.ok) {
                atualizarListaCliente(); // Remove da lista imediatamente
            }
        } catch (erro) {
            console.error("Erro ao cancelar:", erro);
        }
    }
}