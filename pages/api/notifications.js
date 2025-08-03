// pages/api/notifications.js
import { createNotification, getUserNotifications, getUsersByProfiles } from '../../utils/supabase/notificationQueries';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getUserPermissions } from '../../utils/supabase/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // Verificar autenticação
      const session = await getServerSession(req, res, authOptions);
      if (!session) {
        return res.status(401).json({ error: 'Não autenticado.' });
      }

      // Verificar permissões de admin
      const userPermissions = await getUserPermissions(session.id);
      if (!userPermissions?.admin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem enviar notificações.' });
      }

      const { title, message, profiles, notificationType, notificationStyle } = req.body;

      // Validações
      if (!title || !message || !profiles || profiles.length === 0 || !notificationType || !notificationStyle) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios e ao menos um perfil deve ser selecionado.' });
      }

      // Validar tipos permitidos
      const validNotificationTypes = ['bell', 'top', 'both'];
      const validNotificationStyles = ['aviso', 'informacao'];
      
      if (!validNotificationTypes.includes(notificationType)) {
        return res.status(400).json({ error: 'Tipo de notificação inválido.' });
      }
      
      if (!validNotificationStyles.includes(notificationStyle)) {
        return res.status(400).json({ error: 'Estilo de notificação inválido.' });
      }

      // Buscar usuários pelos perfis selecionados (via Supabase)
      const targetUsers = await getUsersByProfiles(profiles);

      if (targetUsers.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuário elegível encontrado. Verifique os perfis selecionados.' });
      }

      // Criar notificação no Supabase
      const notificationResult = await createNotification({
        title,
        message,
        notification_type: notificationType,
        notification_style: notificationStyle,
        target_profiles: profiles,
        created_by: session.id
      });

      if (!notificationResult.success) {
        return res.status(500).json({ error: `Erro ao criar notificação: ${notificationResult.error}` });
      }

      res.status(201).json({ 
        message: `Notificação enviada com sucesso para ${targetUsers.length} usuário(s) nos perfis: ${profiles.join(', ')}!`,
        notification_id: notificationResult.data.id,
        target_users_count: targetUsers.length
      });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  } else if (req.method === 'GET') {
    try {
      // Verificar autenticação
      const session = await getServerSession(req, res, authOptions);
      if (!session) {
        return res.status(401).json({ error: 'Não autenticado.' });
      }

      const { notificationType = 'bell', limit: limitParam } = req.query;
      const limitValue = limitParam ? parseInt(limitParam, 10) : 20;

      // Buscar permissões do usuário para obter o perfil
      const userPermissions = await getUserPermissions(session.id);
      if (!userPermissions) {
        return res.status(400).json({ error: 'Não foi possível obter o perfil do usuário.' });
      }

      // Buscar notificações via Supabase
      console.log(`Buscando notificações para usuário ${session.id} com perfil ${userPermissions.profile}`);
      const notifications = await getUserNotifications(
        session.id, 
        userPermissions.profile, 
        notificationType, 
        limitValue
      );
      
      console.log(`Retornando ${notifications.length} notificações, ${notifications.filter(n => !n.read).length} não lidas`);
      console.log('Primeiras 3 notificações:', notifications.slice(0, 3).map(n => ({
        id: n.id,
        title: n.title,
        read: n.read,
        read_at: n.read_at
      })));

      res.status(200).json({ 
        notifications,
        total: notifications.length,
        unread_count: notifications.filter(n => !n.read).length
      });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}