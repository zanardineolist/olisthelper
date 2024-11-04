// pages/api/notifications.js
import { db } from '../../utils/firebase/firebaseConfig';
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      }

      // Buscar usuários da aba "Usuários" do Google Sheets
      let users;
      try {
        users = await getSheetValues('Usuários');
      } catch (sheetError) {
        console.error('Erro ao buscar usuários do Google Sheets:', sheetError);
        return res.status(500).json({ error: 'Erro ao buscar usuários do Google Sheets.' });
      }
      
      if (!users || users.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuário encontrado.' });
      }

      // Filtrar usuários dos perfis "analyst", "tax", "super"
      const targetUsers = users.filter(user => 
        user.role === 'analyst' || user.role === 'tax' || user.role === 'super'
      );

      if (targetUsers.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuário elegível encontrado.' });
      }

      // Adiciona notificação ao Firestore para cada usuário alvo
      const notificationsCollection = collection(db, 'notifications');
      const promises = targetUsers.map(async (user) => {
        try {
          return await addDoc(notificationsCollection, {
            userId: user.id,
            title,
            message,
            read: false,
            timestamp: new Date(),
          });
        } catch (notificationError) {
          console.error(`Erro ao adicionar notificação para o usuário ${user.id}:`, notificationError);
          throw notificationError; // Se ocorrer erro, lançar para interromper a execução
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
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
      }

      // Buscar notificações do usuário no Firestore
      const notificationsCollection = collection(db, 'notifications');
      const q = query(notificationsCollection, where("userId", "==", userId));
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