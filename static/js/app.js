// --- DEVMATCH JAVASCRIPT FRONTEND ---

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização comum
    const currentPath = window.location.pathname;
    
    // Carregar tecnologias se necessário
    if (document.getElementById('tech-container') || 
        document.getElementById('project-tech-container') || 
        document.getElementById('tech-filter')) {
        carregarTecnologias();
    }

    // Roteamento simples de páginas
    if (currentPath === '/cadastro' || currentPath.endsWith('cadastro.html')) {
        initCadastro();
    } else if (currentPath === '/mural' || currentPath.endsWith('mural.html')) {
        initMural();
    } else if (currentPath === '/novo-projeto' || currentPath.endsWith('novo-projeto.html')) {
        initNovoProjeto();
    } else if (currentPath === '/perfil' || currentPath.endsWith('perfil.html')) {
        initPerfil();
    }
});

// Helper: Mostrar notificações premium (Toast)
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    toastMessage.textContent = message;
    
    if (isError) {
        toast.classList.add('error');
        toastIcon.className = 'fa-solid fa-circle-exclamation';
    } else {
        toast.classList.remove('error');
        toastIcon.className = 'fa-solid fa-circle-check';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Fetch global de tecnologias para filtros e cadastros
function carregarTecnologias() {
    fetch('/api/tecnologias')
        .then(res => res.json())
        .then(techs => {
            // Preencher filtros no Mural
            const filterSelect = document.getElementById('tech-filter');
            if (filterSelect) {
                techs.forEach(tech => {
                    const opt = document.createElement('option');
                    opt.value = tech;
                    opt.textContent = tech;
                    filterSelect.appendChild(opt);
                });
            }
            
            // Preencher checkboxes de cadastro
            const container = document.getElementById('tech-container') || document.getElementById('project-tech-container');
            if (container) {
                container.innerHTML = '';
                techs.forEach(tech => {
                    const label = document.createElement('label');
                    label.className = 'tech-checkbox-label';
                    label.innerHTML = `
                        <input type="checkbox" name="tecnologias" value="${tech}">
                        <span>${tech}</span>
                    `;
                    container.appendChild(label);
                });
            }
        })
        .catch(err => console.error("Erro ao carregar tecnologias:", err));
}

// --- LOGICA DE CADASTRO ---
function initCadastro() {
    const form = document.getElementById('cadastro-form');
    const emailInput = document.getElementById('user-email');
    const btnLogout = document.getElementById('btn-logout');
    
    // Verificar se já está logado
    const loggedUser = JSON.parse(localStorage.getItem('devmatch_user'));
    if (loggedUser) {
        carregarPerfilNoForm(loggedUser.email);
        btnLogout.style.display = 'inline-flex';
    }

    // Verificar se o email já existe ao sair do campo (onBlur) para carregar o perfil automaticamente
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && validarEmail(email)) {
            carregarPerfilNoForm(email);
        }
    });

    // Logout
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('devmatch_user');
        form.reset();
        btnLogout.style.display = 'none';
        document.getElementById('form-title').textContent = 'Crie seu Perfil';
        showToast("Você saiu da conta.");
    });

    // Enviar Cadastro
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('user-nome').value.trim();
        const email = emailInput.value.trim();
        const nivel = document.getElementById('user-nivel').value;
        const bio = document.getElementById('user-bio').value.trim();
        
        // Obter checkboxes marcadas
        const tecnologias = Array.from(document.querySelectorAll('input[name="tecnologias"]:checked'))
                                 .map(cb => cb.value);
                                 
        const linkedin = document.getElementById('user-linkedin').value.trim();
        const github = document.getElementById('user-github').value.trim();
        const discord = document.getElementById('user-discord').value.trim();
        
        // Validações
        if (!nome || !email || !nivel || !bio) {
            showToast("Preencha todos os campos obrigatórios (*)", true);
            return;
        }
        
        if (!validarEmail(email)) {
            showToast("E-mail com formato inválido", true);
            return;
        }

        if (linkedin && !validarUrl(linkedin)) {
            showToast("O link do LinkedIn deve ser um endereço válido", true);
            return;
        }
        
        if (github && !validarUrl(github)) {
            showToast("O link do GitHub deve ser um endereço válido", true);
            return;
        }

        const payload = { nome, email, nivel, bio, tecnologias, linkedin, github, discord };
        
        fetch('/api/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.erro) {
                showToast(data.erro, true);
            } else {
                // Salvar no localStorage
                localStorage.setItem('devmatch_user', JSON.stringify({
                    id: data.usuario_id,
                    nome: nome,
                    email: email
                }));
                
                showToast("Perfil salvo com sucesso!");
                btnLogout.style.display = 'inline-flex';
                
                setTimeout(() => {
                    window.location.href = '/mural';
                }, 1500);
            }
        })
        .catch(err => {
            console.error("Erro no cadastro:", err);
            showToast("Erro de conexão com o servidor", true);
        });
    });
}

function carregarPerfilNoForm(email) {
    fetch(`/api/perfil/email/${encodeURIComponent(email)}`)
        .then(res => {
            if (res.ok) return res.json();
            return null;
        })
        .then(user => {
            if (user) {
                document.getElementById('user-nome').value = user.nome;
                document.getElementById('user-nivel').value = user.nivel;
                document.getElementById('user-bio').value = user.bio;
                document.getElementById('user-linkedin').value = user.linkedin || '';
                document.getElementById('user-github').value = user.github || '';
                document.getElementById('user-discord').value = user.discord || '';
                
                // Marcar tecnologias
                document.querySelectorAll('input[name="tecnologias"]').forEach(cb => {
                    cb.checked = user.tecnologias.includes(cb.value);
                });
                
                document.getElementById('form-title').textContent = 'Editar Perfil';
                document.getElementById('form-subtitle').textContent = 'Edite os dados do seu perfil cadastrado.';
                
                // Garantir que localstorage esteja atualizado
                localStorage.setItem('devmatch_user', JSON.stringify({
                    id: user.id,
                    nome: user.nome,
                    email: user.email
                }));
            }
        })
        .catch(err => console.error("Erro ao obter perfil:", err));
}

// --- LOGICA DO MURAL DE PROJETOS ---
function initMural() {
    const projectsContainer = document.getElementById('projects-container');
    const searchInput = document.getElementById('search-input');
    const techFilter = document.getElementById('tech-filter');
    const btnReset = document.getElementById('btn-reset-filters');
    
    // Carregar todos os projetos inicialmente
    buscarProjetos();

    // Filtros dinâmicos com Debounce
    let debounceTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            buscarProjetos();
        }, 300);
    });

    techFilter.addEventListener('change', buscarProjetos);

    btnReset.addEventListener('click', () => {
        searchInput.value = '';
        techFilter.value = '';
        buscarProjetos();
        showToast("Filtros limpos");
    });
}

function buscarProjetos() {
    const query = document.getElementById('search-input').value.trim();
    const tech = document.getElementById('tech-filter').value;
    const container = document.getElementById('projects-container');
    
    let url = '/api/projects?';
    let urlParams = [];
    if (query) urlParams.push(`q=${encodeURIComponent(query)}`);
    if (tech) urlParams.push(`tech=${encodeURIComponent(tech)}`);
    
    const fetchUrl = '/api/projetos?' + urlParams.join('&');
    
    fetch(fetchUrl)
        .then(res => res.json())
        .then(projects => {
            container.innerHTML = '';
            
            if (projects.length === 0) {
                container.innerHTML = `
                    <div class="no-projects">
                        <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-dark); margin-bottom: 1.5rem;"></i>
                        <h3>Nenhum projeto encontrado</h3>
                        <p>Tente alterar os termos da busca ou os filtros de tecnologias.</p>
                    </div>
                `;
                return;
            }
            
            projects.forEach(project => {
                const card = document.createElement('article');
                card.className = 'project-card';
                
                // Formatar Data
                const dateObj = new Date(project.data_criacao);
                const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
                
                // Tags HTML
                const techTagsHTML = project.tecnologias_requeridas.map(t => `<span class="tech-tag">${t}</span>`).join('');
                
                // Nível Classe CSS
                let nivelClass = 'level-iniciante';
                if (project.criador_nivel === 'Intermediário') nivelClass = 'level-intermediario';
                if (project.criador_nivel === 'Avançado') nivelClass = 'level-avancado';
                
                // Links Sociais Dinâmicos
                let socialLinksHTML = '';
                if (project.criador_linkedin) {
                    socialLinksHTML += `<a href="${project.criador_linkedin}" class="social-icon" target="_blank" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>`;
                }
                if (project.criador_github) {
                    socialLinksHTML += `<a href="${project.criador_github}" class="social-icon" target="_blank" title="GitHub"><i class="fa-brands fa-github"></i></a>`;
                }
                if (project.criador_discord) {
                    socialLinksHTML += `<a href="#" class="social-icon" onclick="event.preventDefault(); alert('Discord do Idealizador: ${project.criador_discord}');" title="Discord: ${project.criador_discord}"><i class="fa-brands fa-discord"></i></a>`;
                }
                
                card.innerHTML = `
                    <div>
                        <div class="project-meta">
                            <span class="date-badge">${formattedDate}</span>
                            <span class="level-badge ${nivelClass}">${project.criador_nivel}</span>
                        </div>
                        <h3>${project.titulo}</h3>
                        <p class="desc">${project.descricao}</p>
                        <div class="tech-tags">
                            ${techTagsHTML}
                        </div>
                    </div>
                    
                    <div class="project-creator">
                        <div class="creator-info">
                            <h4 style="margin: 0;"><a href="/perfil?id=${project.criador_id}" style="color: var(--text-main); text-decoration: none; font-weight: 600;">${project.criador_nome}</a></h4>
                            <span>Idealizador</span>
                        </div>
                        <div class="social-links">
                            ${socialLinksHTML}
                        </div>
                    </div>
                `;
                
                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error("Erro ao buscar projetos:", err);
            container.innerHTML = `
                <div class="no-projects" style="border-color: var(--accent);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--accent); margin-bottom: 1.5rem;"></i>
                    <h3>Erro de conexão</h3>
                    <p>Não foi possível carregar os projetos no momento. Verifique se o servidor está rodando.</p>
                </div>
            `;
        });
}

// --- LOGICA DE CRIAÇÃO DE PROJETOS ---
function initNovoProjeto() {
    const warningBox = document.getElementById('login-warning-box');
    const formBox = document.getElementById('project-form-box');
    const form = document.getElementById('projeto-form');
    
    // Verificar se está logado
    const loggedUser = JSON.parse(localStorage.getItem('devmatch_user'));
    
    if (!loggedUser) {
        warningBox.style.display = 'block';
        formBox.style.display = 'none';
        return;
    }
    
    // Submissão de projeto
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const titulo = document.getElementById('proj-titulo').value.trim();
        const descricao = document.getElementById('proj-descricao').value.trim();
        
        // Checkboxes marcadas
        const tecnologias_requeridas = Array.from(document.querySelectorAll('input[name="tecnologias"]:checked'))
                                            .map(cb => cb.value);
                                            
        if (!titulo || !descricao) {
            showToast("Preencha todos os campos obrigatórios (*)", true);
            return;
        }
        
        if (tecnologias_requeridas.length === 0) {
            showToast("Selecione pelo menos uma tecnologia necessária", true);
            return;
        }
        
        const payload = {
            titulo,
            descricao,
            tecnologias_requeridas,
            criador_id: loggedUser.id
        };
        
        fetch('/api/projetos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.erro) {
                showToast(data.erro, true);
            } else {
                showToast("Projeto publicado com sucesso!");
                setTimeout(() => {
                    window.location.href = '/mural';
                }, 1500);
            }
        })
        .catch(err => {
            console.error("Erro ao criar projeto:", err);
            showToast("Erro ao conectar ao servidor", true);
        });
    });
}

// --- LOGICA DE VISUALIZAÇÃO DE PERFIL ---
function initPerfil() {
    const urlParams = new URLSearchParams(window.location.search);
    let userId = urlParams.get('id');
    
    // Se não tiver ID nos parâmetros, tenta obter do usuário logado
    if (!userId) {
        const loggedUser = JSON.parse(localStorage.getItem('devmatch_user'));
        if (loggedUser) {
            userId = loggedUser.id;
        } else {
            // Se não tiver ID nem login, mostra erro
            exibirErroPerfil();
            return;
        }
    }
    
    fetch(`/api/perfil/${userId}`)
        .then(res => {
            if (res.ok) return res.json();
            throw new Error("Perfil não encontrado");
        })
        .then(user => {
            document.getElementById('profile-loading').style.display = 'none';
            document.getElementById('profile-container').style.display = 'grid';
            
            // Preencher dados básicos
            document.getElementById('prof-nome').textContent = user.nome;
            document.getElementById('prof-bio').textContent = user.bio || 'Sem biografia disponível.';
            
            // Avatar
            const iniciais = user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            document.getElementById('prof-avatar').textContent = iniciais;
            
            // Nível Badge
            const nivelBadge = document.getElementById('prof-nivel');
            nivelBadge.textContent = user.nivel;
            nivelBadge.className = 'level-badge'; // Reset
            if (user.nivel === 'Iniciante') nivelBadge.classList.add('level-iniciante');
            if (user.nivel === 'Intermediário') nivelBadge.classList.add('level-intermediario');
            if (user.nivel === 'Avançado') nivelBadge.classList.add('level-avancado');
            
            // Redes Sociais
            configurarLinkSocial('prof-link-linkedin', user.linkedin);
            configurarLinkSocial('prof-link-github', user.github);
            
            // Discord (com clique)
            const discordLink = document.getElementById('prof-link-discord');
            if (user.discord) {
                discordLink.style.display = 'flex';
                discordLink.onclick = (e) => {
                    e.preventDefault();
                    alert(`Discord: ${user.discord}`);
                };
            } else {
                discordLink.style.display = 'none';
            }
            
            // Tecnologias
            const techContainer = document.getElementById('prof-techs');
            techContainer.innerHTML = '';
            if (user.tecnologias.length > 0) {
                user.tecnologias.forEach(tech => {
                    const badge = document.createElement('span');
                    badge.className = 'tech-tag';
                    badge.textContent = tech;
                    techContainer.appendChild(badge);
                });
            } else {
                techContainer.innerHTML = '<span style="color: var(--text-dark); font-style: italic;">Nenhuma cadastrada</span>';
            }
            
            // Buscar projetos publicados por este usuário
            carregarProjetosDoPerfil(user.id, user.nome);
        })
        .catch(err => {
            console.error(err);
            exibirErroPerfil();
        });
}

function configurarLinkSocial(elementId, url) {
    const el = document.getElementById(elementId);
    if (url) {
        el.style.display = 'flex';
        el.href = url;
    } else {
        el.style.display = 'none';
    }
}

function carregarProjetosDoPerfil(userId, userName) {
    const container = document.getElementById('prof-projects');
    
    // Obter todos os projetos e filtrar localmente para facilitar
    fetch('/api/projetos')
        .then(res => res.json())
        .then(projects => {
            const userProjects = projects.filter(p => p.criador_id === userId);
            container.innerHTML = '';
            
            if (userProjects.length === 0) {
                container.innerHTML = `<p class="no-projects" style="padding: 2rem;">Nenhum projeto publicado por ${userName} ainda.</p>`;
                return;
            }
            
            userProjects.forEach(proj => {
                const item = document.createElement('div');
                item.className = 'project-card';
                item.style.padding = '1.5rem';
                item.style.marginBottom = '1rem';
                
                const techBadges = proj.tecnologias_requeridas.map(t => `<span class="tech-tag">${t}</span>`).join('');
                
                item.innerHTML = `
                    <h4 style="font-size: 1.15rem; margin-bottom: 0.5rem;">${proj.titulo}</h4>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">${proj.descricao}</p>
                    <div class="tech-tags" style="margin-bottom: 0;">
                        ${techBadges}
                    </div>
                `;
                container.appendChild(item);
            });
        })
        .catch(err => console.error("Erro ao carregar projetos do perfil:", err));
}

function exibirErroPerfil() {
    document.getElementById('profile-loading').style.display = 'none';
    document.getElementById('profile-error-box').style.display = 'block';
}

// --- UTILS VALIDAÇÕES ---
function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validarUrl(str) {
    try {
        new URL(str);
        return true;
    } catch (_) {
        return false;  
    }
}
