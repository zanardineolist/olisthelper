// pages/api/admin/notifications/[id].js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { getUserPermissions } from '../../../../utils/supabase/supabaseClient';
import { updateNotification, deleteNotification } from '../../../../utils/supabase/notificationQueries';

export default async function handler(req, res) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    // Verificar permissões de admin
    const userPermissions = await getUserPermissions(session.id);
    if (!userPermissions?.admin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar notificações.' });
    }

    const { id } = req.query;

    if (req.method === 'PUT') {
      // Atualizar notificação
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Título e mensagem são obrigatórios.' });
      }

      const result = await updateNotification(id, { title, message });

      if (!result.success) {
        return res.status(500).json({ error: `Erro ao atualizar notificação: ${result.error}` });
      }

      res.status(200).json({ 
        message: 'Notificação atualizada com sucesso!',
        notification: result.data
      });

    } else if (req.method === 'DELETE') {
      // Deletar notificação
      const result = await deleteNotification(id);

      if (!result.success) {
        return res.status(500).json({ error: `Erro ao deletar notificação: ${result.error}` });
      }

      res.status(200).json({ 
        message: 'Notificação deletada com sucesso!'
      });

    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('Erro na API admin/notifications/[id]:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}