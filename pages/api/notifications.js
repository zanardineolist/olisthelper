import { db } from '../../utils/firebase/firebaseConfig';
import { collection, setDoc, doc, getDocs, query, where, limit } from "firebase/firestore";
import { supabase } from '../../utils/supabase';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { title, message, profiles, notificationType, notificationStyle } = req.body;

      // 1. Validação de entrada
      if (!title || !message || !profiles || profiles.length === 0 || !notificationType || !notificationStyle) {
        return res.status(400).json({ 
          error: 'Todos os campos são obrigatórios e ao menos um perfil deve ser selecionado.' 
        });
      }

      // 2. Buscar usuários alvos no Supabase
      const { data: targetUsers, error: userError } = await supabase
        .from('users')
        .select('*')
        .in('role', profiles);

      if (userError) {
        console.error('Erro ao buscar usuários:', userError);
        return res.status(500).json({ error: 'Erro ao buscar usuários no Supabase.' });
      }

      if (!targetUsers || targetUsers.length === 0) {
        return res.status(400).json({ 
          error: 'Nenhum usuário encontrado para os perfis selecionados.' 
        });
      }

      // 3. Preparar notificações no Firestore
      const notificationsCollection = collection(db, 'notifications');
      const timestamp = new Date().getTime();

      // 4. Criar notificações para cada usuário
      const notifications = targetUsers.map(user => {
        const baseNotification = {
          userId: user.user_id,
          userEmail: user.email,
          userRole: user.role,
          title,
          message,
          notificationStyle,
          read: false,
          timestamp,
          created_at: new Date().toISOString()
        };

        // Criar IDs únicos para cada tipo de notificação
        if (notificationType === 'both') {
          return [
            {
              ...baseNotification,
              notificationType: 'bell',
              id: `bell_${uuidv4()}`
            },
            {
              ...baseNotification,
              notificationType: 'top',
              id: `top_${uuidv4()}`
            }
          ];
        } else {
          return [{
            ...baseNotification,
            notificationType,
            id: `${notificationType}_${uuidv4()}`
          }];
        }
      }).flat();

      // 5. Salvar notificações no Firestore
      const savePromises = notifications.map(async notification => {
        const notificationDoc = doc(notificationsCollection, notification.id);
        await setDoc(notificationDoc, notification);

        // 6. Backup no Supabase
        try {
          await supabase.from('notifications_backup').insert([{
            notification_id: notification.id,
            user_id: notification.userId,
            title: notification.title,
            message: notification.message,
            type: notification.notificationType,
            style: notification.notificationStyle,
            created_at: notification.created_at
          }]);
        } catch (backupError) {
          console.error('Erro ao fazer backup da notificação:', backupError);
          // Não falhar se o backup falhar
        }
      });

      await Promise.all(savePromises);

      // 7. Retornar sucesso
      return res.status(201).json({
        message: 'Notificações enviadas com sucesso!',
        stats: {
          totalUsers: targetUsers.length,
          totalNotifications: notifications.length,
          profiles,
          timestamp
        }
      });

    } catch (error) {
      console.error('Erro ao processar notificações:', error);
      return res.status(500).json({ 
        error: 'Erro ao processar notificações.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } 
  else if (req.method === 'GET') {
    try {
      const { userId, userRole, limit: limitParam } = req.query;

      // 1. Validação de entrada
      if (!userId || !userRole) {
        return res.status(400).json({ error: 'ID do usuário e perfil são obrigatórios.' });
      }

      // 2. Verificar usuário no Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError || !userData) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // 3. Configurar query do Firestore
      const limitValue = limitParam ? parseInt(limitParam, 10) : 10;
      const notificationsCollection = collection(db, 'notifications');
      const q = query(
        notificationsCollection,
        where("userId", "==", userId),
        where("userRole", "==", userRole),
        limit(limitValue)
      );

      // 4. Buscar notificações
      const querySnapshot = await getDocs(q);
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 5. Preparar resposta
      return res.status(200).json({
        notifications,
        metadata: {
          count: notifications.length,
          user: {
            id: userId,
            role: userRole,
            name: userData.name
          },
          hasMore: notifications.length === limitValue
        }
      });

    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar notificações.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } 
  else {
    return res.status(405).json({ error: 'Método não permitido' });
  }
}