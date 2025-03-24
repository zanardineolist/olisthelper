// pages/api/manage-records.js
import { supabaseAdmin } from '../../utils/supabase/supabaseClient';
import { logAction } from '../../utils/firebase/firebaseLogging';

export default async function handler(req, res) {
  const { method } = req;
  const { userId } = req.query;

  // Extrair informações do usuário dos cookies
  const requesterId = req.cookies['user-id'];
  const requesterName = req.cookies['user-name'];
  const requesterRole = req.cookies['user-role'];

  const reqUser = {
    id: requesterId,
    name: requesterName,
    role: requesterRole,
  };

  const isUserValid = reqUser && reqUser.id && reqUser.name && reqUser.role;

  if (!userId) {
    return res.status(400).json({ error: 'ID do usuário não fornecido' });
  }

  try {
    switch (method) {
      case 'GET':
        console.log('Método GET chamado - Carregando registros...');
        const { data: records, error: fetchError } = await supabaseAdmin
          .from('help_records')
          .select(`
            *,
            categories:category_id(name)
          `)
          .eq('analyst_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Mapear dados para manter compatibilidade com o frontend
        const formattedRecords = records.map((record, index) => {
          const createdAt = new Date(record.created_at);
          return {
            index,
            date: createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            time: createdAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            name: record.requester_name,
            email: record.requester_email,
            category: record.categories?.name || '',
            description: record.description,
            id: record.id // Adicionando ID para operações de update/delete
          };
        });

        return res.status(200).json({ records: formattedRecords });

      case 'PUT':
        console.log('Método PUT chamado - Atualizando registro...');
        const { record } = req.body;
        const recordId = record.id;

        if (!record) {
          return res.status(400).json({ error: 'Dados do registro não fornecidos' });
        }

        // Buscar categoria pelo nome
        const { data: categoryData, error: categoryError } = await supabaseAdmin
          .from('categories')
          .select('id')
          .eq('name', record.category)
          .single();

        if (categoryError) throw categoryError;

        // Buscar registro atual para logging
        const { data: currentRecord, error: currentError } = await supabaseAdmin
          .from('help_records')
          .select('*')
          .eq('id', recordId)
          .single();

        if (currentError) throw currentError;

        // Atualizar registro
        const { data: updatedRecord, error: updateError } = await supabaseAdmin
          .from('help_records')
          .update({
            requester_name: record.name,
            requester_email: record.email,
            category_id: categoryData.id,
            description: record.description
          })
          .eq('id', recordId)
          .select()
          .single();

        if (updateError) throw updateError;

        if (isUserValid) {
          await logAction(
            reqUser.id,
            reqUser.name,
            reqUser.role,
            'update_record',
            'Registro',
            {
              name: currentRecord.requester_name,
              email: currentRecord.requester_email,
              category: currentRecord.categories?.name,
              description: currentRecord.description
            },
            {
              name: record.name,
              email: record.email,
              category: record.category,
              description: record.description
            },
            'manage-records'
          );
        }

        return res.status(200).json({ message: 'Registro atualizado com sucesso' });

      case 'DELETE':
        console.log('Método DELETE chamado - Excluindo registro...');
        const deleteId = req.query.recordId;

        if (!deleteId) {
          return res.status(400).json({ error: 'ID do registro não fornecido' });
        }

        // Buscar registro antes de deletar para logging
        const { data: recordToDelete, error: fetchDeleteError } = await supabaseAdmin
          .from('help_records')
          .select('*, categories(name)')
          .eq('id', deleteId)
          .single();

        if (fetchDeleteError) throw fetchDeleteError;

        // Deletar o registro
        const { error: deleteError } = await supabaseAdmin
          .from('help_records')
          .delete()
          .eq('id', deleteId);

        if (deleteError) throw deleteError;

        if (isUserValid) {
          await logAction(
            reqUser.id,
            reqUser.name,
            reqUser.role,
            'delete_record',
            'Registro',
            {
              name: recordToDelete.requester_name,
              email: recordToDelete.requester_email,
              category: recordToDelete.categories?.name,
              description: recordToDelete.description
            },
            null,
            'manage-records'
          );
        }

        return res.status(200).json({ message: 'Registro excluído com sucesso' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Método ${method} não permitido`);
    }
  } catch (error) {
    console.error('Erro ao processar requisição de registros:', error);
    return res.status(500).json({ error: 'Erro ao processar requisição' });
  }
}