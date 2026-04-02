/**
 * =================================================================
 * 🔄 JUPTI - Worker de Recorrência (process-recurring-commitments.js)
 * =================================================================
 * Descrição:
 * - Identifica compromissos vencidos (calls, postings, jupti_moments).
 * - Gera automaticamente a próxima ocorrência (7 em 7 dias).
 * - Ciclo de Postagens: Segunda a Domingo 23:59.
 * - Ciclo de Ligações: Dia específico + 1h de tolerância.
 */

const { Pool } = require('pg');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Busca compromissos que venceram e não têm uma versão futura agendada
        const expiredCommitmentsQuery = `
            SELECT pc.* 
            FROM pending_commitments pc
            WHERE pc.type IN ('calls', 'postings', 'jupti_moments') 
            AND pc.due_date < NOW()
            AND NOT EXISTS (
                SELECT 1 FROM pending_commitments next_pc
                WHERE next_pc.user_id = pc.user_id
                AND next_pc.original_commitment_id = pc.original_commitment_id
                AND next_pc.type = pc.type
                AND next_pc.due_date > pc.due_date
            );
        `;
        
        const result = await client.query(expiredCommitmentsQuery);
        console.log(`🔍 Encontrados ${result.rows.length} compromissos para renovação.`);

        for (const item of result.rows) {
            const currentDueDate = new Date(item.due_date);
            const nextDueDate = new Date(currentDueDate);
            
            // Para todos os tipos recorrentes (calls, postings, moments), o ciclo é de 7 dias
            nextDueDate.setDate(currentDueDate.getDate() + 7);

            // No caso de postagens/moments, garantimos que o vencimento seja Domingo 23:59:59
            if (item.type === 'postings' || item.type === 'jupti_moments') {
                nextDueDate.setHours(23, 59, 59, 999);
            }

            const insertQuery = `
                INSERT INTO pending_commitments (
                    user_id, original_commitment_id, child_id, title, type, due_date, urgency, status, details,
                    total_goal, remaining_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
            `;

            await client.query(insertQuery, [
                item.user_id,
                item.original_commitment_id,
                item.child_id,
                item.title,
                item.type,
                nextDueDate.toISOString(),
                item.urgency,
                'pendente',
                item.details,
                item.total_goal || 1,
                item.total_goal || 1 // Reseta o contador para a nova semana
            ]);
            
            console.log(`✅ Renovado: ${item.title} para o usuário ${item.user_id} em ${nextDueDate.toISOString()}`);
        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                processed: result.rows.length,
                message: "Recorrências processadas com sucesso."
            })
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ ERRO NO WORKER:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: error.message }) };
    } finally {
        client.release();
    }
};
