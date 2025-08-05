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
    return res.status(400).json({ 
      error: 'ID do usuário não fornecido. Erro interno do sistema.' 
    });
  }

  try {
    switch (method) {
      case 'GET':
        try {
          const { data: records, error: fetchRecordsError } = await supabaseAdmin
            .from('help_records')
            .select(`
              *,
              categories:category_id(name)
            `)
            .eq('analyst_id', userId)
            .order('created_at', { ascending: false });

          if (fetchRecordsError) {
            console.error('Erro ao buscar registros:', fetchRecordsError);
            return res.status(500).json({ 
              error: 'Erro interno do servidor ao carregar registros. Tente novamente em alguns instantes.' 
            });
          }

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
              id: record.id
            };
          });

          return res.status(200).json({ records: formattedRecords });
        } catch (error) {
          console.error('Erro ao processar registros:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao processar registros. Tente novamente em alguns instantes.' 
          });
        }

      case 'PUT':
        const { record } = req.body;
        const recordId = record.id;

        // Validações obrigatórias
        if (!record) {
          return res.status(400).json({ 
            error: 'Dados do registro não fornecidos. Erro interno do sistema.' 
          });
        }

        if (!recordId) {
          return res.status(400).json({ 
            error: 'ID do registro não fornecido. Erro interno do sistema.' 
          });
        }

        if (!record.name || !record.name.trim()) {
          return res.status(400).json({ 
            error: 'Nome do solicitante é obrigatório. Por favor, preencha o campo "Nome".' 
          });
        }

        if (!record.email || !record.email.trim()) {
          return res.status(400).json({ 
            error: 'E-mail do solicitante é obrigatório. Por favor, preencha o campo "E-mail".' 
          });
        }

        // Validar formato do e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.email.trim())) {
          return res.status(400).json({ 
            error: 'Formato de e-mail inválido. Por favor, insira um e-mail válido (exemplo: usuario@empresa.com).' 
          });
        }

        if (!record.category || !record.category.trim()) {
          return res.status(400).json({ 
            error: 'Categoria é obrigatória. Por favor, selecione uma categoria.' 
          });
        }

        if (!record.description || !record.description.trim()) {
          return res.status(400).json({ 
            error: 'Descrição é obrigatória. Por favor, preencha o campo "Descrição".' 
          });
        }

        try {
          // Buscar categoria pelo nome
          const { data: categoryData, error: categoryError } = await supabaseAdmin
            .from('categories')
            .select('id, name')
            .eq('name', record.category.trim())
            .eq('active', true)
            .single();

          if (categoryError) {
            console.error('Erro ao buscar categoria:', categoryError);
            return res.status(400).json({ 
              error: `Categoria "${record.category.trim()}" não encontrada ou inativa. Por favor, selecione uma categoria válida.` 
            });
          }

          // Buscar registro atual para logging
          const { data: currentRecord, error: currentError } = await supabaseAdmin
            .from('help_records')
            .select('*, categories(name)')
            .eq('id', recordId)
            .single();

          if (currentError) {
            console.error('Erro ao buscar registro atual:', currentError);
            return res.status(404).json({ 
              error: 'Registro não encontrado. O registro pode ter sido removido ou você não tem permissão para editá-lo.' 
            });
          }

          // Atualizar registro
          const { data: updatedRecord, error: updateRecordError } = await supabaseAdmin
            .from('help_records')
            .update({
              requester_name: record.name.trim(),
              requester_email: record.email.trim().toLowerCase(),
              category_id: categoryData.id,
              description: record.description.trim()
            })
            .eq('id', recordId)
            .select()
            .single();

          if (updateRecordError) {
            console.error('Erro ao atualizar registro:', updateRecordError);
            return res.status(500).json({ 
              error: 'Erro interno do servidor ao atualizar registro. Tente novamente em alguns instantes.' 
            });
          }

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
                name: record.name.trim(),
                email: record.email.trim().toLowerCase(),
                category: record.category.trim(),
                description: record.description.trim()
              },
              'manage-records'
            );
          }

          return res.status(200).json({ 
            message: `Registro atualizado com sucesso.` 
          });
        } catch (error) {
          console.error('Erro ao processar atualização:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao processar atualização. Tente novamente em alguns instantes.' 
          });
        }

      case 'DELETE':
        const deleteId = req.query.recordId;

        if (!deleteId) {
          return res.status(400).json({ 
            error: 'ID do registro não fornecido. Erro interno do sistema.' 
          });
        }

        try {
          // Buscar registro antes de deletar para logging
          const { data: recordToDelete, error: fetchDeleteError } = await supabaseAdmin
            .from('help_records')
            .select('*, categories(name)')
            .eq('id', deleteId)
            .single();

          if (fetchDeleteError) {
            console.error('Erro ao buscar registro para exclusão:', fetchDeleteError);
            return res.status(404).json({ 
              error: 'Registro não encontrado. O registro pode ter sido removido anteriormente.' 
            });
          }

          // Deletar o registro
          const { error: deleteRecordError } = await supabaseAdmin
            .from('help_records')
            .delete()
            .eq('id', deleteId);

          if (deleteRecordError) {
            console.error('Erro ao deletar registro:', deleteRecordError);
            return res.status(500).json({ 
              error: 'Erro interno do servidor ao excluir registro. Tente novamente em alguns instantes.' 
            });
          }

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

          return res.status(200).json({ 
            message: `Registro excluído com sucesso.` 
          });
        } catch (error) {
          console.error('Erro ao processar exclusão:', error);
          return res.status(500).json({ 
            error: 'Erro interno do servidor ao processar exclusão. Tente novamente em alguns instantes.' 
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          error: `Método ${method} não permitido. Use GET, PUT ou DELETE.` 
        });
    }
  } catch (error) {
    console.error('Erro não tratado na API manage-records:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor. Tente novamente em alguns instantes ou entre em contato com o suporte.' 
    });
  }
}