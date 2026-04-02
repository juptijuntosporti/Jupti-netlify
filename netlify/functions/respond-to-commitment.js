/**
 * =================================================================
 * 🤝 JUPTI - API para Responder a um Compromisso (respond-to-commitment.js)
 * =================================================================
 * ✅ VERSÃO SUPREMA - CORREÇÃO DE METAS (POSTAGENS E MOMENTOS)
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const authenticateToken = (headers) => {
    const authHeader = headers.authorization;
    if (!authHeader) throw new Error('Token de autenticação não fornecido.');
    const token = authHeader.split(' ')[1];
    if (!token) throw new Error('Token mal formatado.');
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido ou expirado.');
    }
};

/**
 * 1️⃣ Função para obter o próximo dia da semana (ALGORITMO DE LIGAÇÃO)
 */
function getProximoDiaSemana(diaDesejado, horaDesejada) {
    const hoje = new Date();
    const hojeBrasilia = new Date(hoje.getTime() - (3 * 60 * 60 * 1000));
    const diaAtual = hojeBrasilia.getUTCDay();
    const [horas, minutos] = (horaDesejada || '18:00').split(':').map(Number);

    let diff = diaDesejado - diaAtual;
    if (diff < 0) {
        diff += 7;
    } else if (diff === 0) {
        const agoraEmMinutos = hojeBrasilia.getUTCHours() * 60 + hojeBrasilia.getUTCMinutes();
        const horaDesejadaEmMinutos = horas * 60 + minutos;
        if (agoraEmMinutos >= horaDesejadaEmMinutos) diff = 7;
    }

    const resultado = new Date(hojeBrasilia);
    resultado.setUTCDate(hojeBrasilia.getUTCDate() + diff);
    resultado.setUTCHours(horas, minutos, 0, 0);
    return new Date(resultado.getTime() + (3 * 60 * 60 * 1000));
}

/**
 * 2️⃣ Função para obter o próximo domingo 23:59 (ALGORITMO DE POSTAGEM)
 */
function getProximoDomingoVencimento() {
    const hoje = new Date();
    const diaAtual = hoje.getDay(); 
    let diff = (7 - diaAtual) % 7;
    const vencimento = new Date(hoje);
    vencimento.setDate(hoje.getDate() + diff);
    vencimento.setHours(23, 59, 59, 999);
    if (vencimento < hoje) vencimento.setDate(vencimento.getDate() + 7);
    return vencimento;
}

/**
 * Função Auxiliar: Obter o segundo domingo (Período de Adaptação)
 */
function getSecondSunday(date) {
    const d = new Date(date);
    d.setDate(1); 
    let sundays = 0;
    while (sundays < 2) {
        if (d.getDay() === 0) sundays++;
        if (sundays < 2) d.setDate(d.getDate() + 1);
    }
    return d;
}

/**
 * ✅ FUNÇÃO: Gerar Compromissos Pendentes
 */
async function generatePendingCommitments(client, commitmentId, childId, details) {
    console.log(`🚀 Iniciando geração robusta para UUID: ${commitmentId}`);

    const guardianQuery = `SELECT user_id, relationship_type FROM child_guardians WHERE child_id = $1;`;
    const guardianResult = await client.query(guardianQuery, [childId]);
    if (guardianResult.rows.length === 0) return;

    const parentA = guardianResult.rows.find(g => g.relationship_type === 'PRIMARY_GUARDIAN' || g.relationship_type === 'PAI_A')?.user_id;
    const parentB = guardianResult.rows.find(g => g.relationship_type === 'SECONDARY_GUARDIAN' || g.relationship_type === 'PAI_B')?.user_id;

    const typeTitles = {
        postings: 'Postagem de Foto/Vídeo',
        jupti_moments: 'Momento JUPTI',
        calls: 'Chamada de Vídeo/Voz',
        visits: 'Visita/Convivência',
        pension: 'Pagamento de Pensão'
    };

    const daysMap = {
        'domingo': 0, 'dom': 0,
        'segunda': 1, 'segunda-feira': 1, 'seg': 1,
        'terça': 2, 'terça-feira': 2, 'terca': 2, 'terca-feira': 2, 'ter': 2,
        'quarta': 3, 'quarta-feira': 3, 'qua': 3,
        'quinta': 4, 'quinta-feira': 4, 'qui': 4,
        'sexta': 5, 'sexta-feira': 5, 'sex': 5,
        'sábado': 6, 'sabado': 6, 'sab': 6
    };

    const keyMap = {
        postings: ['postings', 'postagens', 'posting', 'foto', 'fotos'],
        jupti_moments: ['jupti_moments', 'momentos_jupti', 'jupti_moment', 'momentos', 'momento'],
        calls: ['calls', 'ligações', 'ligação', 'ligacoes', 'ligacao', 'call'],
        visits: ['visits', 'visitas', 'visita', 'visit', 'convivência', 'convivencia'],
        pension: ['pension', 'pensão', 'pensao']
    };

    const startDateAdaptação = getSecondSunday(new Date());

    for (const normalizedKey in keyMap) {
        try {
            let item = null;
            for (const alias of keyMap[normalizedKey]) {
                if (details[alias]) {
                    item = details[alias];
                    break;
                }
            }

            if (!item) continue;

            const isAccepted = item.status === 'accepted' || item.status === 'aceito';
            if (!isAccepted) continue;

            const data = item.suggestion || item.sugestão || item.original || item;
            
            let responsibleIds = []; 
            let title = typeTitles[normalizedKey] || 'Compromisso';
            let urgency = 'normal';
            let itemDetails = '';
            let dueDates = []; // { expiry: Date, meta: number }

            switch (normalizedKey) {
                case 'pension':
                    responsibleIds = [parentB || parentA];
                    const pDay = data.date ? parseInt(String(data.date).split('-').pop()) : 10;
                    let pDate = new Date(startDateAdaptação.getFullYear(), startDateAdaptação.getMonth(), pDay, 23, 59, 59);
                    if (pDate < startDateAdaptação) pDate.setMonth(pDate.getMonth() + 1);
                    dueDates.push({ expiry: pDate, meta: 1 });
                    urgency = 'high';
                    itemDetails = `Valor: R$ ${data.value || '0.00'}. ${data.observations || ''}`;
                    break;

                case 'postings':
                case 'jupti_moments':
                    responsibleIds = [parentA || parentB];
                    // ✅ CORREÇÃO DE META: Tenta ler goal, meta ou frequency
                    let metaVal = parseInt(data.goal || data.meta || data.frequency || (normalizedKey === 'postings' ? '3' : '1'));
                    if (isNaN(metaVal) || metaVal <= 0) metaVal = (normalizedKey === 'postings' ? 3 : 1);
                    
                    const domVenc = getProximoDomingoVencimento();
                    dueDates.push({ expiry: domVenc, meta: metaVal });
                    itemDetails = `Meta: ${metaVal}. Faltam: ${metaVal}.`;
                    break;

                case 'calls':
                    responsibleIds = [parentA, parentB].filter(id => id != null);
                    const callDays = data.preferred_days || data.dias_preferidos || data.days || [];
                    const callTime = data.time || data.horário || data.horario || '18:00';
                    
                    if (Array.isArray(callDays) && callDays.length > 0) {
                        callDays.forEach(dayName => {
                            const diaLimpo = String(dayName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            const diaNum = daysMap[diaLimpo];
                            if (diaNum !== undefined) {
                                const callDate = getProximoDiaSemana(diaNum, callTime);
                                const expiryDate = new Date(callDate.getTime() + (1 * 60 * 60 * 1000));
                                dueDates.push({ expiry: expiryDate, meta: 1 });
                            }
                        });
                    }
                    
                    if (dueDates.length === 0) {
                        const defaultDate = getProximoDomingoVencimento();
                        defaultDate.setHours(18, 0, 0, 0);
                        const defaultExpiry = new Date(defaultDate.getTime() + (1 * 60 * 60 * 1000));
                        dueDates.push({ expiry: defaultExpiry, meta: 1 });
                    }
                    itemDetails = `Horário agendado: ${callTime}. Tolerância: 1 hora.`;
                    break;

                case 'visits':
                    responsibleIds = [parentB || parentA];
                    const vStartDate = data.start_date || data.data_inicio || data.inicio;
                    if (vStartDate) {
                        let vDate = new Date(vStartDate);
                        vDate.setHours(23, 59, 59);
                        dueDates.push({ expiry: vDate, meta: 1 });
                    } else {
                        dueDates.push({ expiry: getProximoDomingoVencimento(), meta: 1 });
                    }
                    itemDetails = `Tipo: ${data.type || 'Visita'}.`;
                    break;
            }

            // Inserção no banco
            for (const rId of responsibleIds) {
                for (const dObj of dueDates) {
                    const insertQuery = `
                        INSERT INTO pending_commitments (
                            user_id, original_commitment_id, child_id, title, type, due_date, urgency, status, details, 
                            total_goal, remaining_count
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
                    `;
                    await client.query(insertQuery, [
                        rId, commitmentId, childId, title, normalizedKey, dObj.expiry.toISOString(), urgency, 'pendente', 
                        itemDetails, dObj.meta, dObj.meta
                    ]);
                    console.log(`✅ Gerado: ${title} para usuário ${rId} com meta ${dObj.meta}`);
                }
            }
        } catch (err) {
            console.error(`❌ Erro no tipo ${normalizedKey}:`, err);
        }
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        const decodedToken = authenticateToken(event.headers);
        const responderId = decodedToken.userId;
        const { commitmentId, responses } = JSON.parse(event.body);

        await client.query('BEGIN');

        const commitmentQuery = `
            SELECT id, created_by_user_id, other_parent_id, child_id, details, negotiation_status
            FROM commitments WHERE id = $1 FOR UPDATE;
        `;
        const commitmentResult = await client.query(commitmentQuery, [commitmentId]);
        if (commitmentResult.rows.length === 0) throw new Error('Compromisso não encontrado.');
        const commitment = commitmentResult.rows[0];

        let hasSuggestions = false;
        const newDetails = {};

        for (const key in commitment.details) {
            const userResponse = responses[key];
            const originalItem = commitment.details[key];

            if (!userResponse) {
                newDetails[key] = originalItem;
                continue;
            }

            if (userResponse.status === 'suggested') {
                hasSuggestions = true;
                newDetails[key] = {
                    status: 'suggested',
                    original: originalItem.original || originalItem,
                    suggestion: userResponse.data
                };
            } else {
                newDetails[key] = {
                    status: 'accepted',
                    original: originalItem.original || originalItem,
                    suggestion: originalItem.suggestion || originalItem.sugestão || null,
                    observation: userResponse.observation || null
                };
            }
        }

        const newStatus = hasSuggestions ? 'COUNTER_PROPOSED' : 'ACCEPTED';
        await client.query(`UPDATE commitments SET details = $1, negotiation_status = $2, updated_at = NOW() WHERE id = $3;`, 
            [JSON.stringify(newDetails), newStatus, commitmentId]);

        if (newStatus === 'ACCEPTED') {
            await generatePendingCommitments(client, commitmentId, commitment.child_id, newDetails);
        }

        await client.query(`UPDATE notifications SET is_read = TRUE, status = 'RESPONDED' WHERE recipient_id = $1 AND related_entity_id = $2;`, [responderId, commitmentId]);
        
        let recipient = (commitment.negotiation_status === 'PROPOSED') ? commitment.created_by_user_id : commitment.other_parent_id;
        await client.query(`INSERT INTO notifications (recipient_id, sender_id, type, related_entity_id, child_id) VALUES ($1, $2, $3, $4, $5);`, 
            [recipient, responderId, hasSuggestions ? 'COUNTER_PROPOSAL_RECEIVED' : 'PROPOSAL_ACCEPTED', commitmentId, commitment.child_id]);

        await client.query('COMMIT');
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Processado com sucesso!', finalStatus: newStatus }) };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ ERRO:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: error.message }) };
    } finally {
        client.release();
    }
};
