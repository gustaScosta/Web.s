from flask import Flask, request, jsonify, send_file
import os
import database

app = Flask(__name__, static_folder='static', static_url_path='')

# Inicializar o banco de dados antes de rodar
database.inicializar_banco()

# Rotas de navegação amigável (sem .html)
@app.route('/')
def home():
    return send_file(os.path.join('static', 'index.html'))

@app.route('/mural')
def mural():
    return send_file(os.path.join('static', 'mural.html'))

@app.route('/cadastro')
def cadastro():
    return send_file(os.path.join('static', 'cadastro.html'))

@app.route('/novo-projeto')
def novo_projeto():
    return send_file(os.path.join('static', 'novo-projeto.html'))

@app.route('/perfil')
def perfil():
    return send_file(os.path.join('static', 'perfil.html'))


# Endpoints da API

@app.route('/api/cadastro', methods=['POST'])
def api_cadastro():
    data = request.json
    if not data:
        return jsonify({"erro": "Dados inválidos"}), 400
        
    nome = data.get('nome')
    email = data.get('email')
    bio = data.get('bio', '')
    tecnologias = data.get('tecnologias', [])
    nivel = data.get('nivel', 'Iniciante')
    linkedin = data.get('linkedin', '')
    github = data.get('github', '')
    discord = data.get('discord', '')
    
    if not nome or not email:
        return jsonify({"erro": "Nome e Email são obrigatórios"}), 400
        
    try:
        user_id = database.criar_usuario(nome, email, bio, tecnologias, nivel, linkedin, github, discord)
        return jsonify({"sucesso": True, "usuario_id": user_id}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/api/projetos', methods=['GET'])
def api_get_projetos():
    query = request.args.get('q')
    tecnologia = request.args.get('tech')
    try:
        projects = database.obter_projetos(query=query, tecnologia=tecnologia)
        return jsonify(projects), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/api/projetos', methods=['POST'])
def api_post_projeto():
    data = request.json
    if not data:
        return jsonify({"erro": "Dados inválidos"}), 400
        
    titulo = data.get('titulo')
    descricao = data.get('descricao')
    tecnologias_requeridas = data.get('tecnologias_requeridas', [])
    criador_id = data.get('criador_id')
    
    if not titulo or not descricao or not criador_id:
        return jsonify({"erro": "Título, Descrição e ID do Criador são obrigatórios"}), 400
        
    try:
        project_id = database.criar_projeto(titulo, descricao, tecnologias_requeridas, criador_id)
        return jsonify({"sucesso": True, "projeto_id": project_id}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/api/perfil/<int:id>', methods=['GET'])
def api_get_perfil(id):
    try:
        user = database.obter_usuario_por_id(id)
        if user:
            return jsonify(user), 200
        return jsonify({"erro": "Usuário não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/api/perfil/email/<string:email>', methods=['GET'])
def api_get_perfil_by_email(email):
    try:
        user = database.obter_usuario(email)
        if user:
            return jsonify(user), 200
        return jsonify({"erro": "Usuário não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/api/tecnologias', methods=['GET'])
def api_get_tecnologias():
    # Retorna uma lista de tecnologias padrão para preencher os filtros no frontend
    techs = ["React", "HTML", "CSS", "JavaScript", "Python", "Flask", "SQL", "Node.js", "Java", "C#", "Git", "Flutter", "TypeScript"]
    return jsonify(techs), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
