// pages/api/admin/notifications.js
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getUserPermissions } from '../../../utils/supabase/supabaseClient';
import { getAllNotificationsForAdmin } from '../../../utils/supabase/notificationQueries';

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
      // Buscar todas as notificações para administração
      const notifications = await getAllNotificationsForAdmin();
      
      res.status(200).json({ 
        notifications,
        total: notifications.length
      });

    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('Erro na API admin/notifications:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}