// pages/api/admin/notifications.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getUserPermissions } from '../../../utils/supabase/supabaseClient';
import { supabaseAdmin } from '../../../utils/supabase/supabaseClient';

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

    if (req.method === 'GET') {
      // Buscar todas as notificações com informações do criador
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select(`
          *,
          users!notifications_created_by_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
      }

      // Adicionar nome do criador
      const notificationsWithCreator = data?.map(notification => ({
        ...notification,
        creator_name: notification.users?.name || 'Sistema'
      })) || [];

      res.status(200).json({ 
        notifications: notificationsWithCreator,
        total: notificationsWithCreator.length
      });

    } else if (req.method === 'PUT') {
      // Atualizar notificação (não implementado neste caso - notificações são imutáveis)
      res.status(405).json({ error: 'Edição de notificações não é permitida.' });

    } else if (req.method === 'DELETE') {
      // Deletar notificação (não implementado neste caso - notificações são imutáveis)
      res.status(405).json({ error: 'Exclusão de notificações não é permitida.' });

    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('Erro na API admin/notifications:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}