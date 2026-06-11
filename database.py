import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'devmatch.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def inicializar_banco():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Criar tabela de usuarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            bio TEXT,
            tecnologias TEXT, -- Armazenado como string JSON
            nivel TEXT,       -- Iniciante, Intermediário, Avançado
            linkedin TEXT,
            github TEXT,
            discord TEXT
        )
    ''')
    
    # Criar tabela de projetos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projetos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            tecnologias_requeridas TEXT, -- Armazenado como string JSON
            criador_id INTEGER NOT NULL,
            data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (criador_id) REFERENCES usuarios (id)
        )
    ''')
    
    conn.commit()
    
    # Adicionar dados de semente se estiver vazio
    cursor.execute('SELECT COUNT(*) FROM usuarios')
    if cursor.fetchone()[0] == 0:
        # Criar usuários de semente
        usuarios_semente = [
            ("Gustavo de Souza Costa", "gustavo@eniac.edu.br", "Estudante de Engenharia de Software no Eniac. Entusiasta de Inteligência Artificial e Front-end.", json.dumps(["React", "HTML", "CSS", "JavaScript"]), "Iniciante", "https://linkedin.com/in/gustavo", "https://github.com/gustavocosta", "gustavo#1234"),
            ("Alysson Oliveira Brito", "alysson@eniac.edu.br", "Desenvolvedor focado em Backend com Python. Gosto de trabalhar em APIs REST e infraestrutura.", json.dumps(["Python", "Flask", "SQL", "Git"]), "Intermediário", "https://linkedin.com/in/alysson", "https://github.com/alyssonbrito", "alysson#5678"),
            ("Pedro Henrique Nemet", "pedro@eniac.edu.br", "Full Stack Developer. Interessado em arquitetura de software e bancos de dados relacionais.", json.dumps(["JavaScript", "Node.js", "SQL", "React", "Python"]), "Avançado", "https://linkedin.com/in/pedro", "https://github.com/pedronemet", "pedro#9012")
        ]
        
        for u in usuarios_semente:
            cursor.execute('''
                INSERT INTO usuarios (nome, email, bio, tecnologias, nivel, linkedin, github, discord)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', u)
        conn.commit()
        
        # Obter IDs gerados
        cursor.execute('SELECT id, nome FROM usuarios')
        users = {row['nome']: row['id'] for row in cursor.fetchall()}
        
        # Criar projetos de semente
        projetos_semente = [
            ("DevMatch - Plataforma de Conexão", 
             "Um site para ajudar estudantes e desenvolvedores a encontrar parceiros de estudo e construir portfólios realistas.", 
             json.dumps(["HTML", "CSS", "JavaScript", "Python", "Flask", "SQL"]), 
             users["Gustavo de Souza Costa"]),
            
            ("API de Gerenciamento de Biblioteca", 
             "Desenvolvimento de uma API robusta para controle de empréstimos de livros de forma automatizada.", 
             json.dumps(["Python", "Flask", "SQL", "Git"]), 
             users["Alysson Oliveira Brito"]),
            
            ("App de Finanças Pessoais", 
             "Aplicativo para controle de gastos mensais com gráficos interativos e exportação de relatórios.", 
             json.dumps(["React", "JavaScript", "CSS"]), 
             users["Pedro Henrique Nemet"])
        ]
        
        for p in projetos_semente:
            cursor.execute('''
                INSERT INTO projetos (titulo, descricao, tecnologias_requeridas, criador_id)
                VALUES (?, ?, ?, ?)
            ''', p)
        conn.commit()
        print("Banco de dados inicializado com dados de semente.")
    else:
        print("Banco de dados já existente e populado.")
        
    conn.close()

# Funções auxiliares
def criar_usuario(nome, email, bio, tecnologias, nivel, linkedin, github, discord):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO usuarios (nome, email, bio, tecnologias, nivel, linkedin, github, discord)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (nome, email, bio, json.dumps(tecnologias), nivel, linkedin, github, discord))
        conn.commit()
        user_id = cursor.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        # Se já existe, atualiza
        cursor.execute('''
            UPDATE usuarios 
            SET nome=?, bio=?, tecnologias=?, nivel=?, linkedin=?, github=?, discord=?
            WHERE email=?
        ''', (nome, bio, json.dumps(tecnologias), nivel, linkedin, github, discord, email))
        conn.commit()
        cursor.execute('SELECT id FROM usuarios WHERE email=?', (email,))
        return cursor.fetchone()[0]
    finally:
        conn.close()

def obter_usuario(email):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM usuarios WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()
    if user:
        user_dict = dict(user)
        user_dict['tecnologias'] = json.loads(user_dict['tecnologias']) if user_dict['tecnologias'] else []
        return user_dict
    return None

def obter_usuario_por_id(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        user_dict = dict(user)
        user_dict['tecnologias'] = json.loads(user_dict['tecnologias']) if user_dict['tecnologias'] else []
        return user_dict
    return None

def criar_projeto(titulo, descricao, tecnologias_requeridas, criador_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO projetos (titulo, descricao, tecnologias_requeridas, criador_id)
        VALUES (?, ?, ?, ?)
    ''', (titulo, descricao, json.dumps(tecnologias_requeridas), criador_id))
    conn.commit()
    project_id = cursor.lastrowid
    conn.close()
    return project_id

def obter_projetos(query=None, tecnologia=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    sql = '''
        SELECT p.*, u.nome as criador_nome, u.email as criador_email, u.nivel as criador_nivel, 
               u.linkedin as criador_linkedin, u.github as criador_github, u.discord as criador_discord
        FROM projetos p
        JOIN usuarios u ON p.criador_id = u.id
    '''
    params = []
    conditions = []
    
    if query:
        conditions.append("(p.titulo LIKE ? OR p.descricao LIKE ?)")
        params.append(f'%{query}%')
        params.append(f'%{query}%')
        
    if tecnologia:
        conditions.append("p.tecnologias_requeridas LIKE ?")
        params.append(f'%"{tecnologia}"%')
        
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
        
    sql += " ORDER BY p.data_criacao DESC"
    
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()
    
    projects = []
    for row in rows:
        p_dict = dict(row)
        p_dict['tecnologias_requeridas'] = json.loads(p_dict['tecnologias_requeridas']) if p_dict['tecnologias_requeridas'] else []
        projects.append(p_dict)
    return projects

if __name__ == '__main__':
    inicializar_banco()
