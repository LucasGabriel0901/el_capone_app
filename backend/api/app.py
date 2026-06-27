import sys
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db_connection.connection import executar_query, buscar_registro, buscar_todos
from notifications import enviar_email_cliente, enviar_email_barbeiro, enviar_whatsapp_barbeiro

load_dotenv()
app = Flask(__name__)
CORS(app)

CODIGO_AUTORIZACAO_MASTER = "123456"

# ==========================================
# ROTA RAIZ (Para o Render não dar erro 404)
# ==========================================
@app.route('/', methods=['GET'])
def home():
    return "🚀 API da Barbearia El Capone está online e rodando perfeitamente na nuvem!", 200

# ==========================================
# ROTAS DO CLIENTE
# ==========================================
@app.route('/api/cadastro', methods=['POST'])
def cadastrar_cliente():
    dados = request.get_json()
    nome, cpf, email, telefone = dados.get('nome'), dados.get('cpf'), dados.get('email'), dados.get('telefone')
    senha_pura, data_nascimento = dados.get('senha'), dados.get('dataNascimento') 
    senha_criptografada = generate_password_hash(senha_pura)
    
    query = "INSERT INTO clientes (nome, cpf, email, telefone, senha, data_nascimento) VALUES (%s, %s, %s, %s, %s, %s)"
    sucesso, mensagem = executar_query(query, (nome, cpf, email, telefone, senha_criptografada, data_nascimento))
    
    if sucesso: return jsonify({"status": "sucesso", "mensagem": "Cadastro realizado com sucesso."}), 201
    return jsonify({"status": "erro", "mensagem": mensagem}), 400

@app.route('/api/login', methods=['POST'])
def login_cliente():
    dados = request.get_json()
    login_user, senha_digitada = dados.get('loginUser'), dados.get('senha')
    query = "SELECT id, nome, senha FROM clientes WHERE email = %s OR cpf = %s"
    usuario = buscar_registro(query, (login_user, login_user))

    if usuario:
        id_usuario, nome, senha_hash_banco = usuario
        if check_password_hash(senha_hash_banco, senha_digitada):
            return jsonify({"status": "sucesso", "mensagem": f"Olá, {nome}! Login autorizado.", "usuario": {"id": id_usuario, "nome": nome}}), 200
    return jsonify({"status": "erro", "mensagem": "Usuário ou senha incorretos."}), 401

# ROTA PARA LISTAR E CADASTRAR PROFISSIONAIS
@app.route('/api/colaboradores', methods=['GET', 'POST'])
def colaboradores():
    if request.method == 'POST':
        dados = request.get_json() or {}

        nome = dados.get('nome')
        cargo = dados.get('cargo')
        cpf = dados.get('cpf')
        email = dados.get('email')
        senha_pura = dados.get('senha')
        whatsapp = dados.get('whatsapp') or dados.get('telefone') or ""
        codigo_autorizacao = dados.get('codigo_autorizacao')

        if codigo_autorizacao != CODIGO_AUTORIZACAO_MASTER:
            return jsonify({"status": "erro", "mensagem": "Código de autorização inválido."}), 403

        if not all([nome, cargo, cpf, email, senha_pura]):
            return jsonify({"status": "erro", "mensagem": "Preencha todos os campos obrigatórios."}), 400

        existe = buscar_registro(
            "SELECT id FROM colaboradores WHERE email = %s OR cpf = %s",
            (email, cpf)
        )

        if existe:
            return jsonify({"status": "erro", "mensagem": "Já existe um colaborador com este e-mail ou CPF."}), 409

        senha_criptografada = generate_password_hash(senha_pura)

        query = """
            INSERT INTO colaboradores (nome, cargo, cpf, email, senha, whatsapp)
            VALUES (%s, %s, %s, %s, %s, %s)
        """

        sucesso, mensagem = executar_query(
            query,
            (nome, cargo, cpf, email, senha_criptografada, whatsapp)
        )

        if sucesso:
            return jsonify({"status": "sucesso", "mensagem": "Colaborador cadastrado com sucesso."}), 201

        return jsonify({"status": "erro", "mensagem": mensagem}), 400

    query = "SELECT id, nome, cargo FROM colaboradores"
    resultados = buscar_todos(query)
    colaboradores = [{"id": l[0], "nome": l[1], "cargo": l[2]} for l in resultados]
    return jsonify(colaboradores), 200

@app.route('/api/agendar', methods=['POST'])
def criar_agendamento():
    dados = request.get_json()
    cliente_id, colaborador_id = dados.get('cliente_id'), dados.get('colaborador_id')
    servico_id, data, hora = dados.get('servico_id'), dados.get('data'), dados.get('hora')
    forma_pagamento = dados.get('forma_pagamento')

    if not all([cliente_id, colaborador_id, servico_id, data, hora, forma_pagamento]):
        return jsonify({"status": "erro", "mensagem": "Dados incompletos para agendamento."}), 400

    precos = {1: 40.00, 2: 30.00, 3: 70.00, 4: 25.00, 5: 80.00}
    nomes_servicos = {1: 'Corte', 2: 'Barba', 3: 'Corte & Barba', 4: 'Limpeza', 5: 'Botox'}
    valor_servico = precos.get(int(servico_id), 0.00)
    nome_servico = nomes_servicos.get(int(servico_id), 'Serviço')

    query = """
        INSERT INTO agendamentos (cliente_id, colaborador_id, servico_id, data, hora, status, forma_pagamento, valor_servico) 
        VALUES (%s, %s, %s, %s, %s, 'agendado', %s, %s)
    """
    sucesso, msg = executar_query(query, (cliente_id, colaborador_id, servico_id, data, hora, forma_pagamento, valor_servico))
    
    if sucesso:
        cliente = buscar_registro("SELECT nome, email, telefone FROM clientes WHERE id = %s", (cliente_id,))
        barbeiro = buscar_registro("SELECT nome, email, whatsapp FROM colaboradores WHERE id = %s", (colaborador_id,))
        
        if cliente and barbeiro:
            info_agendamento = {
                "cliente_nome": cliente[0], "cliente_email": cliente[1], "cliente_telefone": cliente[2],
                "barbeiro_nome": barbeiro[0], "barbeiro_email": barbeiro[1], "barbeiro_whatsapp": barbeiro[2],
                "servico_nome": nome_servico, "data": data, "hora": hora,
                "valor": valor_servico, "forma_pagamento": forma_pagamento
            }
            try:
                enviar_email_cliente(info_agendamento)
                enviar_email_barbeiro(info_agendamento)
                enviar_whatsapp_barbeiro(info_agendamento)
            except Exception as e:
                print("Falha ao notificar:", e)

        return jsonify({"status": "sucesso", "mensagem": "Agendamento realizado com sucesso!"}), 201
    return jsonify({"status": "erro", "mensagem": "Erro ao agendar: " + msg}), 400

@app.route('/api/cliente/agendamentos/<int:cliente_id>', methods=['GET'])
def listar_historico_cliente(cliente_id):
    query = """
        SELECT a.id, s.nome, a.data, a.hora, a.status 
        FROM agendamentos a JOIN servicos s ON a.servico_id = s.id
        WHERE a.cliente_id = %s ORDER BY a.data DESC, a.hora DESC
    """
    resultados = buscar_todos(query, (cliente_id,))
    historico = [{"id": l[0], "servico": l[1], "data": str(l[2]), "hora": str(l[3]), "status": l[4]} for l in resultados]
    return jsonify(historico), 200

# ==========================================
# ROTAS DO COLABORADOR / ADMIN
# ==========================================
@app.route('/api/colaborador/login', methods=['POST'])
def login_colaborador():
    dados = request.get_json()
    login_user, senha_digitada = dados.get('loginUser'), dados.get('senha')
    query = "SELECT id, nome, senha, cargo FROM colaboradores WHERE email = %s OR cpf = %s"
    colaborador = buscar_registro(query, (login_user, login_user))

    if colaborador:
        id_colab, nome, senha_hash_banco, cargo = colaborador
        if check_password_hash(senha_hash_banco, senha_digitada):
            return jsonify({"status": "sucesso", "mensagem": f"Bem-vindo, {nome}!", "colaborador": {"id": id_colab, "nome": nome, "cargo": cargo}}), 200
    return jsonify({"status": "erro", "mensagem": "Credenciais incorretas ou acesso negado."}), 401

@app.route('/api/colaborador/agendamentos/<int:colaborador_id>', methods=['GET'])
def listar_agendamentos_barbeiro(colaborador_id):
    query = """
        SELECT a.id, c.nome, c.telefone, s.nome, a.data, a.hora, a.status
        FROM agendamentos a JOIN clientes c ON a.cliente_id = c.id JOIN servicos s ON a.servico_id = s.id
        WHERE a.colaborador_id = %s ORDER BY a.data ASC, a.hora ASC;
    """
    resultados = buscar_todos(query, (colaborador_id,))
    lista = []
    for l in resultados:
        data_fmt = datetime.strptime(str(l[4]), '%Y-%m-%d').strftime('%d/%m/%y')
        lista.append({"id": l[0], "cliente_nome": l[1], "cliente_telefone": l[2], "servico_nome": l[3], "data": data_fmt, "hora": str(l[5]), "status": l[6]})
    return jsonify(lista), 200

@app.route('/api/agendamentos/<int:agendamento_id>/<acao>', methods=['PUT'])
def atualizar_status_agendamento(agendamento_id, acao):
    if acao == 'concluir': novo_status = 'concluido'
    elif acao == 'cancelar': novo_status = 'cancelado'
    else: return jsonify({"status": "erro", "mensagem": "Ação inválida."}), 400

    query = "UPDATE agendamentos SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
    sucesso, msg = executar_query(query, (novo_status, agendamento_id))
    
    if sucesso: return jsonify({"status": "sucesso", "mensagem": f"Agendamento {novo_status} com sucesso!"}), 200
    return jsonify({"status": "erro", "mensagem": "Erro ao atualizar: " + msg}), 400

@app.route('/api/clientes/busca', methods=['GET'])
def buscar_clientes():
    termo = request.args.get('termo', '').strip()

    if len(termo) < 3:
        return jsonify([]), 200

    termo_like = f"%{termo}%"
    query = """
        SELECT id, nome, cpf, email, telefone, data_nascimento
        FROM clientes
        WHERE nome ILIKE %s OR cpf ILIKE %s OR email ILIKE %s OR telefone ILIKE %s
        ORDER BY nome ASC
        LIMIT 20
    """
    resultados = buscar_todos(query, (termo_like, termo_like, termo_like, termo_like))

    clientes = [
        {
            "id": l[0],
            "nome": l[1],
            "cpf": l[2],
            "email": l[3],
            "telefone": l[4],
            "data_nascimento": str(l[5]) if l[5] else ""
        }
        for l in resultados
    ]

    return jsonify(clientes), 200


@app.route('/api/agendamentos/<int:agendamento_id>/editar', methods=['PUT'])
def editar_agendamento(agendamento_id):
    dados = request.get_json() or {}
    nova_data = dados.get('data')
    nova_hora = dados.get('hora')

    if not nova_data or not nova_hora:
        return jsonify({"status": "erro", "mensagem": "Data e horário são obrigatórios."}), 400

    query = """
        UPDATE agendamentos
        SET data = %s, hora = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    """
    sucesso, mensagem = executar_query(query, (nova_data, nova_hora, agendamento_id))

    if sucesso:
        return jsonify({"status": "sucesso", "mensagem": "Agendamento atualizado com sucesso."}), 200

    return jsonify({"status": "erro", "mensagem": "Erro ao atualizar agendamento: " + mensagem}), 400


@app.route('/api/analises/agendamentos', methods=['GET'])
def analise_agendamentos():
    mes = request.args.get('mes')
    ano = request.args.get('ano')
    if not mes or not ano: return jsonify({"status": "erro", "mensagem": "Mês e ano são obrigatórios"}), 400

    query = "SELECT status, valor_servico FROM agendamentos WHERE EXTRACT(MONTH FROM data) = %s AND EXTRACT(YEAR FROM data) = %s"
    resultados = buscar_todos(query, (mes, ano))

    total = len(resultados)
    concluidos = sum(1 for r in resultados if r[0] == 'concluido')
    cancelados = sum(1 for r in resultados if r[0] == 'cancelado')
    agendados = sum(1 for r in resultados if r[0] == 'agendado')

    valor_previsto = sum(float(r[1] or 0) for r in resultados)
    valor_concluido = sum(float(r[1] or 0) for r in resultados if r[0] == 'concluido')
    valor_perdido = sum(float(r[1] or 0) for r in resultados if r[0] == 'cancelado')

    pct_concluido = (concluidos / total * 100) if total > 0 else 0
    pct_cancelado = (cancelados / total * 100) if total > 0 else 0

    return jsonify({
        "total": total, "concluidos": concluidos, "cancelados": cancelados, "agendados": agendados,
        "valor_previsto": valor_previsto, "valor_concluido": valor_concluido, "valor_perdido": valor_perdido,
        "pct_concluido": round(pct_concluido, 2), "pct_cancelado": round(pct_cancelado, 2)
    }), 200

@app.route('/api/admin/disponibilidade/<int:colab_id>/<data_str>', methods=['GET'])
def buscar_painel_disponibilidade(colab_id, data_str):
    query_agendamentos = "SELECT hora FROM agendamentos WHERE colaborador_id = %s AND data = %s AND status = 'agendado'"
    horas_ocupadas = [str(l[0])[:5] for l in buscar_todos(query_agendamentos, (colab_id, data_str))]

    query_excecoes = "SELECT hora, tipo FROM disponibilidade_excecoes WHERE colaborador_id = %s AND data = %s"
    excecoes_bd = buscar_todos(query_excecoes, (colab_id, data_str))
    
    horas_bloqueadas = [str(l[0])[:5] for l in excecoes_bd if l[1] == 'Bloqueio']
    horas_extras = [str(l[0])[:5] for l in excecoes_bd if l[1] == 'Extra']

    grade = []
    hora_atual = datetime.strptime("09:00", "%H:%M")
    while hora_atual <= datetime.strptime("18:00", "%H:%M"):
        grade.append(hora_atual.strftime("%H:%M"))
        hora_atual += timedelta(minutes=30)
    
    todas_as_horas = sorted(list(set(grade + horas_extras)))

    resultado = []
    for h in todas_as_horas:
        if h in horas_ocupadas: resultado.append({"hora": h, "estado": "Ocupado"})
        elif h in horas_bloqueadas: resultado.append({"hora": h, "estado": "Bloqueado"})
        else: resultado.append({"hora": h, "estado": "Livre"})

    return jsonify(resultado), 200

@app.route('/api/admin/disponibilidade/toggle', methods=['POST'])
def alternar_bloqueio():
    dados = request.get_json()
    colab_id, data, hora, estado = dados['colabId'], dados['data'], dados['hora'], dados['estado']

    if estado == 'Livre':
        executar_query("DELETE FROM disponibilidade_excecoes WHERE colaborador_id=%s AND data=%s AND hora=%s AND tipo='Bloqueio'", (colab_id, data, hora))
    else: 
        executar_query("INSERT INTO disponibilidade_excecoes (colaborador_id, data, hora, tipo, status) VALUES (%s, %s, %s, 'Bloqueio', 'bloqueado')", (colab_id, data, hora))
    return jsonify({"status": "sucesso"}), 200

# ROTA PARA ADICIONAR HORA EXTRA
@app.route('/api/admin/disponibilidade/extra', methods=['POST'])
def adicionar_hora_extra():
    dados = request.get_json()
    colab_id = dados.get('colabId')
    data = dados.get('data')
    hora = dados.get('hora')

    if not all([colab_id, data, hora]):
        return jsonify({"status": "erro", "mensagem": "Dados incompletos"}), 400

    query = "INSERT INTO disponibilidade_excecoes (colaborador_id, data, hora, tipo, status) VALUES (%s, %s, %s, 'Extra', 'livre')"
    sucesso, msg = executar_query(query, (colab_id, data, hora))
    
    if sucesso: 
        return jsonify({"status": "sucesso"}), 200
    return jsonify({"status": "erro", "mensagem": "Erro ao salvar: " + msg}), 400

@app.route('/api/horarios-disponiveis', methods=['GET'])
def horarios_disponiveis():
    colab_id = request.args.get('colaborador_id')
    data_str = request.args.get('data')
    if not colab_id or not data_str: return jsonify([]), 400
        
    query_agendamentos = "SELECT hora FROM agendamentos WHERE colaborador_id = %s AND data = %s AND status = 'agendado'"
    horas_ocupadas = [str(l[0])[:5] for l in buscar_todos(query_agendamentos, (colab_id, data_str))]

    query_excecoes = "SELECT hora, tipo FROM disponibilidade_excecoes WHERE colaborador_id = %s AND data = %s"
    excecoes_bd = buscar_todos(query_excecoes, (colab_id, data_str))
    
    horas_bloqueadas = [str(l[0])[:5] for l in excecoes_bd if l[1] == 'Bloqueio']
    horas_extras = [str(l[0])[:5] for l in excecoes_bd if l[1] == 'Extra']

    grade = []
    hora_atual = datetime.strptime("09:00", "%H:%M")
    while hora_atual <= datetime.strptime("18:00", "%H:%M"):
        grade.append(hora_atual.strftime("%H:%M"))
        hora_atual += timedelta(minutes=30)
    
    todas_as_horas = sorted(list(set(grade + horas_extras)))
    return jsonify([h for h in todas_as_horas if h not in horas_ocupadas and h not in horas_bloqueadas]), 200

# ==========================================
# CONFIGURAÇÃO DE PORTA PARA A NUVEM (RENDER)
# ==========================================
if __name__ == '__main__':
    print("🚀 Preparando o servidor da El Capone...")
    import os
    # O Render exige que o host seja '0.0.0.0' para acessar a internet
    # e ele mesmo fornece a variável de ambiente PORT.
    porta = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=porta)