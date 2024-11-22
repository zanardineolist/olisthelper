// pages/api/notifications.js
import { db } from '../../utils/firebase/firebaseConfig';
import { collection, setDoc, doc, getDocs, query, where } from "firebase/firestore";
import { getSheetValues } from '../../utils/googleSheets';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { title, message, profiles, notificationType } = req.body;

      if (!title || !message || !profiles || profiles.length === 0 || !notificationType) {
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

      // Adiciona notificação ao Firestore para cada usuário alvo, usando setDoc para definir um ID personalizado
      const notificationsCollection = collection(db, 'notifications');
      const promises = targetUsers.map(async (user) => {
        const [userId, userName, userEmail] = user;

        // Gerar um identificador base para a notificação
        const normalizedTitle = title.replace(/\s+/g, '_').toLowerCase();
        const baseNotificationId = `${notificationType}_${normalizedTitle}_${userId}_`;

        // Verificar se já existe uma notificação similar (mesmo tipo, título e usuário)
        const q = query(notificationsCollection, where("userId", "==", userId), where("notificationType", "==", notificationType), where("title", "==", title));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          console.log(`Notificação já enviada para o usuário ${userEmail} com título "${title}".`);
          return; // Se já existe, não adiciona novamente
        }

        // Gerar um ID único para a notificação, evitando duplicidade
        const uniqueId = uuidv4();
        const notificationId = `${baseNotificationId}${uniqueId}`;

        try {
          const notificationDoc = doc(notificationsCollection, notificationId);
          return await setDoc(notificationDoc, {
            userId,
            userEmail,
            title,
            message,
            read: false,
            timestamp: new Date().getTime(),
            notificationType,
          });
        } catch (notificationError) {
          console.error(`Erro ao adicionar notificação para o usuário ${userEmail}:`, notificationError);
          throw notificationError;
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
      const { userId, limit: limitParam } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
      }

      const limitValue = limitParam ? parseInt(limitParam, 10) : 10;

      // Buscar notificações do usuário no Firestore com limitação
      const notificationsCollection = collection(db, 'notifications');
      const q = query(notificationsCollection, where("userId", "==", userId), limit(limitValue));
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
