import { supabase } from '../../utils/supabaseClient';

/**
 * Handler para gerenciar operações de CRUD na tabela de notificações
 */
export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      await getNotifications(req, res);
      break;

    case 'POST':
      await createNotification(req, res);
      break;

    case 'PUT':
      await markNotificationAsRead(req, res);
      break;

    case 'DELETE':
      await deleteNotification(req, res);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${method} não permitido.`);
  }
}

// Listar notificações de um usuário
async function getNotifications(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'ID do usuário não fornecido.' });
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Nenhuma notificação encontrada.' });
    }

    return res.status(200).json({ notifications: data });
  } catch (error) {
    console.error('[GET NOTIFICATIONS] Erro ao listar notificações:', error.message);
    return res.status(500).json({ error: 'Erro ao listar notificações.' });
  }
}

// Criar nova notificação
async function createNotification(req, res) {
  const { user_id, title, message, notification_type } = req.body;

  if (!user_id || !title || !message || !notification_type) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ user_id, title, message, notification_type, read: false }]);

    if (error) throw error;

    return res.status(201).json({ message: 'Notificação criada com sucesso.', notification: data });
  } catch (error) {
    console.error('[CREATE NOTIFICATION] Erro ao criar notificação:', error.message);
    return res.status(500).json({ error: 'Erro ao criar notificação.' });
  }
}

// Marcar notificação como lida
async function markNotificationAsRead(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID da notificação não fornecido.' });
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Notificação marcada como lida.', notification: data });
  } catch (error) {
    console.error('[MARK AS READ] Erro ao marcar notificação como lida:', error.message);
    return res.status(500).json({ error: 'Erro ao marcar notificação como lida.' });
  }
}

// Deletar notificação
async function deleteNotification(req, res) {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID da notificação não fornecido.' });
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Notificação deletada com sucesso.' });
  } catch (error) {
    console.error('[DELETE NOTIFICATION] Erro ao deletar notificação:', error.message);
    return res.status(500).json({ error: 'Erro ao deletar notificação.' });
  }
}
