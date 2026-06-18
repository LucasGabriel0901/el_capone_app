/* =========================================
   main.js - EXCLUSIVO PARA INDEX.HTML
   ========================================= */

function abrirModal(aba) {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.position = 'fixed'; 
    }
    trocarAba(aba);
}

function fecharModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function trocarAba(aba) {
    const telaLogin = document.getElementById('telaLogin');
    const telaCadastro = document.getElementById('telaCadastro');
    if (telaLogin && telaCadastro) {
        telaLogin.style.display = (aba === 'login') ? 'block' : 'none';
        telaCadastro.style.display = (aba === 'cadastro') ? 'block' : 'none';
    }
}

function validarFormularioCadastro() {
    const nomeElem = document.getElementById('nome');
    const emailElem = document.getElementById('email');
    const nascimentoElem = document.getElementById('dataNascimento'); // Puxa o novo campo
    const senhaElem = document.getElementById('senhaCadastro');
    const btnCriarConta = document.getElementById('btnCriarConta');
    const msgSenha = document.getElementById('msgSenha');

    if (!nomeElem || !senhaElem || !btnCriarConta || !nascimentoElem) return;

    const nome = nomeElem.value.trim();
    const email = emailElem.value.trim();
    const nascimento = nascimentoElem.value; // Pega o valor da data (AAAA-MM-DD)
    const senha = senhaElem.value;

    const regeasSenhaOk = senha.length >= 8 && /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha);
    
    if (msgSenha) {
        msgSenha.style.color = regeasSenhaOk ? "#d4af37" : "#888";
    }

    // O botão só habilita se o nome não for vazio, o email tiver @, a data for preenchida e a senha estiver forte
    btnCriarConta.disabled = !(nome !== "" && email.includes('@') && nascimento !== "" && regeasSenhaOk);
}
function alternarVisibilidadeSenha(idInput, idAberto, idFechado) {
    const input = document.getElementById(idInput);
    const aberto = document.getElementById(idAberto);
    const fechado = document.getElementById(idFechado);

    if (!input || !aberto || !fechado) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    aberto.style.display = isPassword ? 'none' : 'block';
    fechado.style.display = isPassword ? 'block' : 'none';
}
async function simularLogin() {
    // 1. Captura os dados digitados na tela de login
    const loginUser = document.getElementById('loginUser').value.trim();
    const senhaLogin = document.getElementById('senhaLogin').value;

    if (!loginUser || !senhaLogin) {
        alert("Por favor, preencha todos os campos do login.");
        return;
    }

    try {
        // 2. Dispara os dados para a nossa rota de validação
        const resposta = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                loginUser: loginUser,
                senha: senhaLogin
            })
        });

        const dados = await resposta.json();

       if (resposta.ok) {
            // 💾 Engenharia de Software: Memoriza o cliente no navegador
            localStorage.setItem('cliente_id', dados.usuario.id);
            localStorage.setItem('cliente_nome', dados.usuario.nome);
            
            alert(dados.mensagem);
            window.location.href = "cliente.html"; // Vai para o painel principal
        } else {
            // Erro: Usuário ou senha errados
            alert("Erro: " + dados.mensagem);
        }
    } catch (erro) {
        alert("Erro de conexão com o servidor do back-end.");
        console.error(erro);
    }
}







// Substitua a antiga simularCadastro por esta:
async function simularCadastro() {
    // 1. Pega os valores que o cliente digitou
    const nome = document.getElementById('nome').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const dataNascimento = document.getElementById('dataNascimento').value;
    const senha = document.getElementById('senhaCadastro').value;

    // 2. Empacota tudo num JSON
    const payload = {
        nome: nome,
        cpf: cpf,
        email: email,
        telefone: telefone,
        dataNascimento: dataNascimento,
        senha: senha
    };

    // 3. Trava o botão para o cliente não clicar duas vezes
    const btn = document.getElementById('btnCriarConta');
    btn.disabled = true;
    btn.innerText = "CADASTRANDO...";

    try {
        // 4. Envia o pacote para o seu motor Python via método POST
        const resposta = await fetch('http://127.0.0.1:5000/api/cadastro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 5. Lê o que o Python respondeu
        const dados = await resposta.json();

        if (resposta.ok) {
            // Se deu tudo certo no banco de dados!
            alert(dados.mensagem);
            window.location.href = "cliente.html"; // Entra no painel
        } else {
            // Se o Python devolveu um erro (ex: CPF já existe)
            alert("Erro: " + dados.mensagem);
            btn.disabled = false;
            btn.innerText = "CRIAR CONTA";
        }
    } catch (erro) {
        // Se o servidor Python estiver desligado
        alert("Erro de conexão com o servidor. A API está rodando?");
        console.error(erro);
        btn.disabled = false;
        btn.innerText = "CRIAR CONTA";
    }
}
/* =========================================
   ANIMAÇÃO DO MENU DESLIZANTE
   ========================================= */
function animarMenu(index, elementoAtual) {
    // 1. Identifica o menu que foi clicado
    const nav = elementoAtual.parentElement;
    
    // 2. Seleciona todos os links daquele menu (ignorando o botão admin para não bugar a matemática)
    const links = nav.querySelectorAll('a:not(.nav-admin)'); 
    
    // 3. Remove a iluminação de todos e ilumina apenas o que foi clicado
    links.forEach(link => link.classList.remove('ativo'));
    elementoAtual.classList.add('ativo');
    
    // 4. Move a barrinha dourada deslizando pela tela (120px é a largura do botão)
    const indicador = nav.querySelector('.indicador-deslizante');
    if (indicador) {
        indicador.style.transform = `translateX(${index * 120}px)`;
    }
}