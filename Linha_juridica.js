/**
 * =================================================================
 * 📊 JUPTI - Linha Jurídica com Gráficos Dinâmicos
 * =================================================================
 * VERSÃO CORRIGIDA - 02/04/2026
 * 
 * FUNCIONALIDADES:
 * 1. ✅ Carrega dados reais de compromissos da API
 * 2. ✅ Gráficos dinâmicos (Cumpridos, Não Cumpridos, Justificados)
 * 3. ✅ Atualiza estatísticas em tempo real
 * 4. ✅ Mantém todos os botões funcionando
 * =================================================================
 */

// Variáveis globais
let chartCumpridos = null;
let chartNaoCumpridos = null;
let chartJustificados = null;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Iniciando Linha Jurídica...");
    await carregarDadosCompromissos();
    inicializarBotoes();
});

/**
 * CARREGAR DADOS REAIS DE COMPROMISSOS
 */
async function carregarDadosCompromissos() {
    try {
        const token = localStorage.getItem('authTokenJUPTI');
        if (!token) {
            console.error('❌ Token não encontrado');
            return;
        }

        // Buscar compromissos da API
        const response = await fetch('/.netlify/functions/get-pending-commitments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) throw new Error("Sessão inválida.");
        const data = await response.json();

        if (data.success && data.commitments) {
            console.log(`✅ ${data.commitments.length} compromissos carregados`);
            processarDadosCompromissos(data.commitments);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar compromissos:', error);
    }
}

/**
 * PROCESSAR DADOS E ATUALIZAR GRÁFICOS
 */
function processarDadosCompromissos(commitments) {
    const agora = new Date();
    
    // Contar compromissos por status
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

    // Atualizar valores nos cards
    document.getElementById('valueCumpridos').textContent = cumpridos;
    document.getElementById('valueNaoCumpridos').textContent = naoCumpridos;
    document.getElementById('valueJustificados').textContent = justificados;

    // Atualizar estatísticas
    const total = commitments.length;
    const presencaValue = total > 0 ? Math.round(((cumpridos + justificados) / total) * 100) : 100;
    
    // Calcular presença parental corretamente
    // Só conta: Cumpridos, Não Cumpridos e Justificados (Pendentes NÃO contam)
    const totalComprometido = cumpridos + naoCumpridos + justificados;
    const presencaCorrigida = totalComprometido > 0 ? Math.round(((cumpridos + justificados) / totalComprometido) * 100) : 100;
    
    // Atualizar presença com %
    const presencaElement = document.getElementById('presenca-parental');
    if (presencaElement) {
        presencaElement.textContent = `${presencaCorrigida}%`;
    }
    
    const progressBar = document.getElementById('progress-bar-fill');
    if (progressBar) {
        progressBar.style.width = `${presencaCorrigida}%`;
    }
    document.getElementById('stats-cumpridos').textContent = cumpridos;
    document.getElementById('stats-nao-cumpridos').textContent = naoCumpridos;
    document.getElementById('stats-pendentes').textContent = pendentes;

    // Criar gráficos
    criarGraficos(cumpridos, naoCumpridos, justificados);
}

/**
 * CRIAR GRÁFICOS COM CHART.JS
 */
function criarGraficos(cumpridos, naoCumpridos, justificados) {
    // Cores padrão do app
    const corCumprido = '#2e7d32';
    const corNaoCumprido = '#c62828';
    const corJustificado = '#f57c00';

    // Gráfico 1: Cumpridos (Doughnut)
    const ctxCumpridos = document.getElementById('chartCumpridos').getContext('2d');
    if (chartCumpridos) chartCumpridos.destroy();
    chartCumpridos = new Chart(ctxCumpridos, {
        type: 'doughnut',
        data: {
            labels: ['Cumpridos'],
            datasets: [{
                data: [cumpridos, 100 - cumpridos],
                backgroundColor: [corCumprido, '#e0e0e0'],
                borderColor: ['#fff', '#fff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Gráfico 2: Não Cumpridos (Doughnut)
    const ctxNaoCumpridos = document.getElementById('chartNaoCumpridos').getContext('2d');
    if (chartNaoCumpridos) chartNaoCumpridos.destroy();
    chartNaoCumpridos = new Chart(ctxNaoCumpridos, {
        type: 'doughnut',
        data: {
            labels: ['Não Cumpridos'],
            datasets: [{
                data: [naoCumpridos, 100 - naoCumpridos],
                backgroundColor: [corNaoCumprido, '#e0e0e0'],
                borderColor: ['#fff', '#fff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Gráfico 3: Justificados (Doughnut)
    const ctxJustificados = document.getElementById('chartJustificados').getContext('2d');
    if (chartJustificados) chartJustificados.destroy();
    chartJustificados = new Chart(ctxJustificados, {
        type: 'doughnut',
        data: {
            labels: ['Justificados'],
            datasets: [{
                data: [justificados, 100 - justificados],
                backgroundColor: [corJustificado, '#e0e0e0'],
                borderColor: ['#fff', '#fff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            }
        }
    });

    console.log(`📊 Gráficos criados - Cumpridos: ${cumpridos}, Não Cumpridos: ${naoCumpridos}, Justificados: ${justificados}`);
}

/**
 * INICIALIZAR BOTÕES (mantém o funcionamento original)
 */
function inicializarBotoes() {
    // --- Lógica para os botões de ação ---
    document.getElementById("legalTimelineBtn")?.addEventListener("click", function() {
        navegarPara("linha_tempo_juridica_view.html");
    });
    
    document.getElementById("generateReportBtn")?.addEventListener("click", function() {
        navegarPara("relatorios_gerados.html");
    });
    
    document.getElementById("forwardToLegalBtn")?.addEventListener("click", function() {
        navegarPara("relatorio_em_analise.html");
    });
    
    document.getElementById("readyForActionBtn")?.addEventListener("click", function() {
        navegarPara("caso_pronto_para_acao.html");
    });

    console.log("✅ Botões inicializados");
}
