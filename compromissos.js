/**
 * =================================================================
 * 📋 JUPTI - Scripts para Compromissos (Versão com Filtros Completos)
 * =================================================================
 * VERSÃO CORRIGIDA - 02/04/2026
 * 
 * CORREÇÕES APLICADAS:
 * 1. ✅ Avatar da criança agora exibe a foto ou a inicial corretamente
 * 2. ✅ Contadores "Faltam X de Y" agora vem do banco de dados
 * 3. ✅ FILTROS IMPLEMENTADOS E FUNCIONANDO
 *    - Filtro por Status: Todos, Pendentes, Vencidos (Não Cumpridos)
 *    - Filtro por Criança: Busca crianças da API e filtra corretamente
 *    - Contadores dinâmicos em cada filtro
 *    - Atualização em tempo real
 * 4. ✅ PRESENÇA PARENTAL CORRIGIDA
 *    - Só conta: Cumpridos, Não Cumpridos e Justificados
 *    - Pendentes NÃO interferem na barra
 * =================================================================
 */

// Variáveis globais
let todosCompromissos = [];
let todasCriancas = [];
let filtroAtual = 'todos';
let criancaSelecionada = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Iniciando carregamento de compromissos...");
    // Limpar seleção de criança na primeira carga para mostrar TODOS os compromissos
    criancaSelecionada = null;
    localStorage.removeItem('selected_child_id');
    await carregarCriancas();
    await carregarCompromissos();
});

/**
 * CARREGAR LISTA DE CRIANÇAS DO USUÁRIO
 */
async function carregarCriancas() {
    try {
        const token = localStorage.getItem('authTokenJUPTI');
        if (!token) return;

        const response = await fetch('/.netlify/functions/get-children-profiles', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) throw new Error("Sessão inválida.");
        const data = await response.json();

        if (data.success && data.children && data.children.length > 0) {
            todasCriancas = data.children;
            console.log(`👶 ${todasCriancas.length} criança(s) carregada(s)`);
            preencherFiltrosCriancas();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar crianças:', error);
    }
}

/**
 * PREENCHER DINAMICAMENTE OS FILTROS DE CRIANÇAS
 */
function preencherFiltrosCriancas() {
    const listaCriancas = document.getElementById('lista-criancas');
    if (!listaCriancas) return;

    listaCriancas.innerHTML = '';

    todasCriancas.forEach(crianca => {
        const filterItem = document.createElement('div');
        filterItem.className = 'filter-item';
        filterItem.onclick = () => filtrarPorCrianca(crianca.id, crianca.full_name);
        
        const avatarUrl = crianca.profile_picture_url && crianca.profile_picture_url.trim() !== ''
            ? crianca.profile_picture_url
            : null;

        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="${crianca.full_name}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 10px; object-fit: cover;">`
            : `<div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #0f4c5c 0%, #1a6b7a 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 10px;">${crianca.full_name.charAt(0).toUpperCase()}</div>`;

        filterItem.innerHTML = `
            ${avatarHtml}
            <span>${crianca.full_name}</span>
        `;
        
        listaCriancas.appendChild(filterItem);
    });
}

/**
 * FILTRAR POR CRIANÇA ESPECÍFICA
 */
function filtrarPorCrianca(childId, childName) {
    console.log(`👶 Filtrando por criança: ${childName} (ID: ${childId})`);
    criancaSelecionada = childId;
    
    if (childId) {
        localStorage.setItem('selected_child_id', childId);
    } else {
        localStorage.removeItem('selected_child_id');
    }
    
    // Recarregar compromissos com o novo filtro
    carregarCompromissos();
}

/**
 * CARREGAR COMPROMISSOS COM FILTRO DE CRIANÇA
 */
async function carregarCompromissos() {
    const listaContainer = document.getElementById('lista-compromissos');
    if (!listaContainer) return;

    try {
        const token = localStorage.getItem('authTokenJUPTI');
        if (!token) {
            listaContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-lock" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="color: #666; margin-bottom: 20px;">Sua sessão expirou ou você não está logado.</p>
                    <button onclick="window.location.href='index.html'" style="background: #004d40; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                        Fazer Login Agora
                    </button>
                </div>
            `;
            return;
        }

        // Usar criança selecionada (se houver)
        // Se criancaSelecionada for null, a API retorna TODOS os compromissos

        let url = '/.netlify/functions/get-pending-commitments';
        if (criancaSelecionada) {
            url += `?child_id=${criancaSelecionada}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) throw new Error("Sessão inválida.");
        const data = await response.json();

        if (data.success && data.commitments && data.commitments.length > 0) {
            todosCompromissos = data.commitments;
            renderizarLista(todosCompromissos);
            atualizarEstatisticas(todosCompromissos);
            atualizarContadoresFiltros();
        } else {
            todosCompromissos = [];
            listaContainer.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #888;"><p>Nenhum compromisso pendente.</p></div>`;
            atualizarEstatisticas([]);
            atualizarContadoresFiltros();
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

/**
 * FUNÇÃO PRINCIPAL DE FILTRO POR STATUS
 */
function filtrar(tipo) {
    filtroAtual = tipo;
    console.log(`🔍 Aplicando filtro de status: ${tipo}`);
    
    // Atualizar classe ativa nos botões
    document.querySelectorAll('.filter-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Encontrar e marcar o filtro clicado como ativo
    const filtroClicado = Array.from(document.querySelectorAll('.filter-item')).find(item => {
        const span = item.querySelector('span:nth-of-type(2)');
        if (!span) return false;
        
        if (tipo === 'todos') return span.textContent.includes('Todos');
        if (tipo === 'pendente') return span.textContent.includes('Aguardando');
        if (tipo === 'nao-cumprido') return span.textContent.includes('Não Cumpridos');
    });
    
    if (filtroClicado) {
        filtroClicado.classList.add('active');
    }
    
    // Filtrar compromissos
    let compromissosFiltrados = [];
    const agora = new Date();
    
    if (tipo === 'todos') {
        compromissosFiltrados = todosCompromissos.filter(c => c.status === 'pendente');
    } else if (tipo === 'pendente') {
        // Pendentes = não vencidos
        compromissosFiltrados = todosCompromissos.filter(c => {
            const isExpired = new Date(c.due_date) < agora;
            return !isExpired && c.status === 'pendente';
        });
    } else if (tipo === 'nao-cumprido') {
        // Não cumpridos = vencidos
        compromissosFiltrados = todosCompromissos.filter(c => {
            const isExpired = new Date(c.due_date) < agora;
            return isExpired && c.status === 'pendente';
        });
    }
    
    // Renderizar lista filtrada
    renderizarLista(compromissosFiltrados);
    atualizarEstatisticas(compromissosFiltrados);
}

/**
 * ATUALIZAR CONTADORES DOS FILTROS
 */
function atualizarContadoresFiltros() {
    const agora = new Date();
    
    // Total de compromissos pendentes
    const totalPendentes = todosCompromissos.filter(c => c.status === 'pendente').length;
    
    // Compromissos não cumpridos (vencidos)
    const naoCumpridos = todosCompromissos.filter(c => {
        const isExpired = new Date(c.due_date) < agora;
        return isExpired && c.status === 'pendente';
    }).length;
    
    // Compromissos aguardando (não vencidos)
    const aguardando = totalPendentes - naoCumpridos;
    
    // Atualizar contadores na interface
    const countTodos = document.getElementById('count-todos');
    const countNaoCumprido = document.getElementById('count-nao-cumprido');
    const countPendente = document.getElementById('count-pendente');
    
    if (countTodos) countTodos.textContent = totalPendentes;
    if (countNaoCumprido) countNaoCumprido.textContent = naoCumpridos;
    if (countPendente) countPendente.textContent = aguardando;
    
    console.log(`📊 Contadores atualizados - Total: ${totalPendentes}, Vencidos: ${naoCumpridos}, Aguardando: ${aguardando}`);
}

function renderizarLista(commitments) {
    const listaContainer = document.getElementById('lista-compromissos');
    listaContainer.innerHTML = ''; 
    const agora = new Date();

    // Separar por status e data
    const naoCumpridos = commitments.filter(c => {
        const isExpired = new Date(c.due_date) < agora;
        return isExpired && c.status === 'pendente';
    });

    const pendentes = commitments.filter(c => {
        const isExpired = new Date(c.due_date) < agora;
        return !isExpired && c.status === 'pendente';
    });

    // Se não há compromissos, mostrar mensagem
    if (naoCumpridos.length === 0 && pendentes.length === 0) {
        listaContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #888;">
                <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhum compromisso nesta categoria.</p>
            </div>
        `;
        return;
    }

    if (naoCumpridos.length > 0) {
        const title = document.createElement('div');
        title.className = 'section-title';
        title.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #c62828;"></i> Não Cumpridos';
        listaContainer.appendChild(title);
        naoCumpridos.forEach(c => listaContainer.appendChild(criarCard(c, true)));
    }

    if (pendentes.length > 0) {
        const pendingTitle = document.createElement('div');
        pendingTitle.className = 'section-title';
        pendingTitle.style.marginTop = '30px';
        pendingTitle.innerHTML = '<i class="fas fa-hourglass-half" style="color: #616161;"></i> Aguardando';
        listaContainer.appendChild(pendingTitle);
        pendentes.forEach(c => listaContainer.appendChild(criarCard(c, false)));
    }
}

function criarCard(c, isExpired) {
    const item = document.createElement('div');
    item.className = 'commitment-item fade-in';
    
    const dataVencimento = new Date(c.due_date);
    const dataFormatada = dataVencimento.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    const horaFormatada = c.type === 'calls' ? " às " + dataVencimento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : "";

    // ✅ Lógica do Avatar - Exibir foto da criança ou inicial
    const avatarHtml = c.child_photo && c.child_photo.trim() !== '' && c.child_photo !== 'icone.png'
        ? `<img src="${c.child_photo}" alt="${c.child_name}" class="child-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
        : `<div class="child-avatar-initial" style="display: ${!c.child_photo || c.child_photo.trim() === '' || c.child_photo === 'icone.png' ? 'flex' : 'none'};">${c.child_name ? c.child_name.charAt(0).toUpperCase() : '?'}</div>`;

    // ✅ Lógica do Contador (Faltam X de Y)
    let metaHtml = "";
    if (c.type === 'postings' || c.type === 'jupti_moments') {
        const total = c.total_goal !== null ? c.total_goal : (c.type === 'postings' ? 3 : 1);
        const faltam = c.remaining_count !== null && c.remaining_count !== undefined ? c.remaining_count : total;
        metaHtml = `<div class="meta-info-badge">Faltam ${faltam} de ${total}</div>`;
    }

    item.innerHTML = `
        <div class="commitment-left">
            <div class="child-avatar-container">${avatarHtml}</div>
            <div class="commitment-info">
                <div class="commitment-title">${c.title}</div>
                <div class="commitment-date">${isExpired ? 'Venceu' : 'Vence'} ${dataFormatada}${horaFormatada}</div>
                ${metaHtml}
            </div>
        </div>
        <div class="commitment-status ${isExpired ? 'status-failed' : 'status-pending'}">
            ${isExpired ? 'NÃO CUMPRIDO' : 'PENDENTE'}
        </div>
    `;
    return item;
}

function atualizarEstatisticas(commitments) {
    const agora = new Date();
    
    // Contar por status
    let cumpridos = 0;
    let naoCumpridos = 0;
    let justificados = 0;
    let pendentes = 0;

    commitments.forEach(c => {
        const isExpired = new Date(c.due_date) < agora;
        
        if (c.status === 'completed') {
            cumpridos++;
        } else if (c.status === 'justified') {
            justificados++;
        } else if (isExpired && c.status === 'pendente') {
            naoCumpridos++;
        } else if (!isExpired && c.status === 'pendente') {
            pendentes++;
        }
    });

    if (document.getElementById('stats-nao-cumpridos')) document.getElementById('stats-nao-cumpridos').textContent = naoCumpridos;
    if (document.getElementById('stats-pendentes')) document.getElementById('stats-pendentes').textContent = pendentes;
    
    // Calcular presença parental corretamente
    // Só conta: Cumpridos, Não Cumpridos e Justificados (Pendentes NÃO contam)
    const totalComprometido = cumpridos + naoCumpridos + justificados;
    const presencaValue = totalComprometido > 0 ? Math.round(((cumpridos + justificados) / totalComprometido) * 100) : 100;
    
    if (document.getElementById('presenca-parental')) document.getElementById('presenca-parental').textContent = `${presencaValue}%`;
    if (document.getElementById('progress-bar-fill')) document.getElementById('progress-bar-fill').style.width = `${presencaValue}%`;
}
