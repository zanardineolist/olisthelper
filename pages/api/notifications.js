// pages/api/notifications.js
import { db } from '../../utils/firebase/firebaseConfig';
import { collection, setDoc, doc, getDocs, query, where } from "firebase/firestore";
import { getSheetValues } from '../../utils/googleSheets';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { title, message, profiles, notificationType, notificationStyle } = req.body; // Adicione notificationStyle aqui

      if (!title || !message || !profiles || profiles.length === 0 || !notificationType || !notificationStyle) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios e ao menos um perfil deve ser selecionado.' });
      }

      // Buscar usuários da aba "Usuários" do Google Sheets, colunas A2:D (ID, Nome, Email, Perfil)
      let users;
      try {
        users = await getSheetValues('Usuários', 'A2:D');
      } catch (sheetError) {
        console.error('Erro ao buscar usuários do Google Sheets:', sheetError);
        return res.status(500).json({ error: 'Erro ao buscar usuários do Google Sheets.' });
      }

      if (!users || users.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuário encontrado.' });
      }

      // Filtrar usuários com base nos perfis selecionados
      const targetUsers = users.filter(user => profiles.includes(user[3]));

      if (targetUsers.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuário elegível encontrado. Verifique os perfis selecionados.' });
      }

      // Adiciona notificação ao Firestore para cada usuário alvo
      const notificationsCollection = collection(db, 'notifications');
      const promises = targetUsers.map(async (user) => {
        const [userId, userName, userEmail, userRole] = user;

        // Função auxiliar para adicionar uma notificação
        const addNotification = async (type) => {
          const normalizedTitle = title.replace(/\s+/g, '_').toLowerCase();
          const uniqueId = uuidv4();
          const notificationId = `${type}_${normalizedTitle}_${userId}_${uniqueId}`;

          try {
            const notificationDoc = doc(notificationsCollection, notificationId);
            await setDoc(notificationDoc, {
              userId,
              userEmail,
              userRole,
              title,
              message,
              notificationStyle, // Usando o valor recebido do req.body
              read: false,
              timestamp: new Date().getTime(),
              notificationType: type,
            });
          } catch (notificationError) {
            console.error(`Erro ao adicionar notificação para o usuário ${userEmail}:`, notificationError);
            throw notificationError;
          }
        };

        if (notificationType === 'both') {
          // Enviar notificações separadas para 'bell' e 'top'
          await addNotification('bell');
          await addNotification('top');
        } else {
          // Enviar notificação única para 'bell' ou 'top'
          await addNotification(notificationType);
        }
      });

      await Promise.all(promises);

      res.status(201).json({ message: 'Notificação enviada para todos os usuários elegíveis!' });
    } catch (error) {
      console.error('Erro ao adicionar notificações:', error);
      res.status(500).json({ error: 'Erro ao adicionar notificações.' });
    }
  } else if (req.method === 'GET') {
    try {
      const { userId, userRole, limit: limitParam } = req.query;

      if (!userId || !userRole) {
        return res.status(400).json({ error: 'ID do usuário e perfil são obrigatórios.' });
      }

      const limitValue = limitParam ? parseInt(limitParam, 10) : 10;

      // Buscar notificações do usuário no Firestore com limitação e baseadas no perfil do usuário
      const notificationsCollection = collection(db, 'notifications');
      const q = query(
        notificationsCollection,
        where("userId", "==", userId),
        where("userRole", "==", userRole),
        limit(limitValue)
      );
      const querySnapshot = await getDocs(q);

      const notifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.status(200).json({ notifications });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({ error: 'Erro ao buscar notificações.' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}