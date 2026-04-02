/**
 * =================================================================
 * 📋 JUPTI - Scripts para Compromissos (Versão Final com Contadores)
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Iniciando carregamento de compromissos...");
    await carregarCompromissos();
});

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

        const urlParams = new URLSearchParams(window.location.search);
        const childId = urlParams.get('child_id') || localStorage.getItem('selected_child_id');
        
        let url = '/.netlify/functions/get-pending-commitments';
        if (childId) url += `?child_id=${childId}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) throw new Error("Sessão inválida.");
        const data = await response.json();

        if (data.success && data.commitments && data.commitments.length > 0) {
            renderizarLista(data.commitments);
            atualizarEstatisticas(data.commitments);
        } else {
            listaContainer.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #888;"><p>Nenhum compromisso pendente.</p></div>`;
            atualizarEstatisticas([]);
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    }
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
        pendingTitle.innerHTML = '<i class="fas fa-clock" style="color: #616161;"></i> Pendentes';
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

    // ✅ Lógica do Avatar
    const avatarHtml = c.child_photo 
        ? `<img src="${c.child_photo}" alt="${c.child_name}" class="child-avatar-img">`
        : `<div class="child-avatar-initial">${c.child_name ? c.child_name.charAt(0).toUpperCase() : '?'}</div>`;

    // ✅ Lógica do Contador (Faltam X de Y)
    let metaHtml = "";
    if (c.type === 'postings' || c.type === 'jupti_moments') {
        const total = c.total_goal || (c.type === 'postings' ? 3 : 1);
        const faltam = c.remaining_count !== undefined ? c.remaining_count : total;
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
    const total = commitments.length;
    const agora = new Date();
    const naoCumpridos = commitments.filter(c => new Date(c.due_date) < agora).length;
    const pendentes = total - naoCumpridos;

    if (document.getElementById('stats-nao-cumpridos')) document.getElementById('stats-nao-cumpridos').textContent = naoCumpridos;
    if (document.getElementById('stats-pendentes')) document.getElementById('stats-pendentes').textContent = pendentes;
    
    const presencaValue = total > 0 ? Math.round(((total - naoCumpridos) / total) * 100) : 100;
    if (document.getElementById('presenca-parental')) document.getElementById('presenca-parental').textContent = `${presencaValue}%`;
    if (document.getElementById('progress-bar-fill')) document.getElementById('progress-bar-fill').style.width = `${presencaValue}%`;
}
