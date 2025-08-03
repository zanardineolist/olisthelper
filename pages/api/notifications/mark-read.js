// pages/api/notifications/mark-read.js
import { markNotificationAsRead, markMultipleNotificationsAsRead } from '../../../utils/supabase/notificationQueries';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const { notificationId, notificationIds } = req.body;

    // Validar entrada
    if (!notificationId && (!notificationIds || !Array.isArray(notificationIds))) {
      return res.status(400).json({ 
        error: 'É necessário fornecer notificationId (única) ou notificationIds (múltiplas).' 
      });
    }

    let success = false;

    if (notificationId) {
      // Marcar uma notificação como lida
      success = await markNotificationAsRead(notificationId, session.id);
    } else if (notificationIds && notificationIds.length > 0) {
      // Marcar múltiplas notificações como lidas
      success = await markMultipleNotificationsAsRead(notificationIds, session.id);
    }

    if (success) {
      res.status(200).json({ 
        message: notificationId 
          ? 'Notificação marcada como lida com sucesso.' 
          : `${notificationIds.length} notificações marcadas como lidas com sucesso.`
      });
    } else {
      res.status(500).json({ error: 'Erro ao marcar notificação(ões) como lida(s).' });
    }

  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}