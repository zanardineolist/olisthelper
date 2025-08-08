// pages/api/excecao-dados/register.js
import { appendExcecaoDadosRow } from '../../../utils/googleSheets';
import { createExcecaoDadosEvent } from '../../../utils/googleCalendar';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { supabaseAdmin, createCategory } from '../../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const {
      linkChamado,
      responsavel,
      espacoAtual,
      espacoAdicional,
      dataRemocao,
      situacao,
    } = req.body || {};

    if (!linkChamado || !responsavel || !dataRemocao || !situacao) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
    }

    // 1) Registrar na planilha específica
    await appendExcecaoDadosRow({
      linkChamado,
      responsavel,
      espacoAtual,
      espacoAdicional,
      dataRemocao,
      situacao,
    });

    // 2) Contabilizar como registro de ajuda (help_records)
    const categoryName = process.env.EXCECAO_DADOS_CATEGORY_NAME || 'Exceção de Dados';
    let categoryId = null;
    try {
      const { data: categoryData } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .eq('active', true)
        .single();
      categoryId = categoryData?.id || null;
    } catch (_) {
      categoryId = null;
    }

    if (!categoryId) {
      const created = await createCategory(categoryName, session.id).catch(() => null);
      categoryId = created?.id || null;
    }

    if (categoryId) {
      const description = `Exceção de Dados: ${linkChamado} | Resp.: ${responsavel} | Espaço atual: ${espacoAtual || '-'} | Adicional: ${espacoAdicional || '-' } | Remoção: ${dataRemocao} | Situação: ${situacao}`;
      await supabaseAdmin
        .from('help_records')
        .insert([
          {
            analyst_id: session.id,
            requester_name: responsavel || session.user?.name || 'Exceção de Dados',
            requester_email: session.user?.email || '',
            category_id: categoryId,
            description,
          },
        ]);
    }

    // 3) Criar evento na agenda específica (opcional, se EXCECAO_DADOS_CALENDAR_ID estiver configurado)
    try {
      await createExcecaoDadosEvent({
        summary: `Remover dados - ${responsavel}`,
        description: `${linkChamado}\nEspaço atual: ${espacoAtual || '-'}\nAdicional: ${espacoAdicional || '-'}\nSituação: ${situacao}`,
        date: dataRemocao,
      });
    } catch (e) {
      // Não bloquear o fluxo por falha de agenda
      console.warn('Falha ao criar evento no calendário de Exceção de Dados:', e?.message || e);
    }

    return res.status(200).json({ message: 'Registro adicionado com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar Exceção de Dados:', error);
    return res.status(500).json({ error: 'Erro interno ao registrar' });
  }
}


