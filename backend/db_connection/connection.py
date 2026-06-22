import os
import psycopg2
from psycopg2 import OperationalError
from dotenv import load_dotenv

# Carrega as variáveis do .env (se você estiver rodando no seu PC)
load_dotenv()

def criar_conexao():
    """
    Cria e retorna uma conexão com o banco de dados PostgreSQL.
    """
    try:
        # 1. Tenta pegar o link gigante do Neon (que está no Render ou no seu .env)
        db_url = os.environ.get("DATABASE_URL")
        
        if db_url:
            # Se achou o link, conecta direto na nuvem!
            conexao = psycopg2.connect(db_url)
        else:
            # 2. Se não achou (ex: rodando local sem .env), usa o banco do seu PC
            conexao = psycopg2.connect(
                host="localhost",
                database="el_capone",
                user="postgres",
                password="Luc@s6575",
                port="5432"
            )
        return conexao
    except OperationalError as e:
        print(f"❌ Erro de Conexão: O banco de dados está offline ou os dados estão incorretos. Detalhe: {e}")
        return None

def executar_query(query, parametros=None):
    """
    Executa comandos de INSERT, UPDATE e DELETE no banco de dados.
    """
    conexao = criar_conexao()
    if conexao is None:
        return False, "Falha na conexão com o banco."
    
    try:
        cursor = conexao.cursor()
        if parametros:
            cursor.execute(query, parametros)
        else:
            cursor.execute(query)
        conexao.commit()
        cursor.close()
        conexao.close()
        return True, "Operação realizada com sucesso!"
    except Exception as e:
        if conexao:
            conexao.rollback()
            conexao.close()
        return False, str(e)

def buscar_registro(query, parametros=None):
    """
    Busca um único registro (usado para Login e checagens pontuais).
    """
    conexao = criar_conexao()
    if conexao is None:
        return None
    
    try:
        cursor = conexao.cursor()
        if parametros:
            cursor.execute(query, parametros)
        else:
            cursor.execute(query)
        resultado = cursor.fetchone()
        cursor.close()
        conexao.close()
        return resultado
    except Exception as e:
        print(f"Erro na busca: {e}")
        if conexao:
            conexao.close()
        return None

def buscar_todos(query, parametros=None):
    """
    Busca múltiplos registros (usado para listar profissionais, histórico e horários disponíveis).
    """
    conexao = criar_conexao()
    if conexao is None:
        return []
    
    try:
        cursor = conexao.cursor()
        if parametros:
            cursor.execute(query, parametros)
        else:
            cursor.execute(query)
        resultados = cursor.fetchall()
        cursor.close()
        conexao.close()
        return resultados
    except Exception as e:
        print(f"Erro na busca geral: {e}")
        if conexao:
            conexao.close()
        return []

# Teste de conexão
if __name__ == "__main__":
    conn = criar_conexao()
    if conn:
        print("Status do Sistema: ✅ Conectado com sucesso ao banco!")
        conn.close()