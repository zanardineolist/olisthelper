// pages/api/notifications.js
import { db } from '../../utils/firebase/firebaseConfig';
import { collection, addDoc } from "firebase/firestore";
import { getSheetValues } from '../../utils/googleSheets'; // Função para buscar dados do Google Sheets

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      }

      // Buscar usuários da aba "Usuários" do Google Sheets
      const users = await getSheetValues('Usuários');
      
      if (!users || users.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuário encontrado.' });
      }

      // Filtrar usuários dos perfis "analyst", "tax", "super"
      const targetUsers = users.filter(user => 
        user.role === 'analyst' || user.role === 'tax' || user.role === 'super'
      );

      // Adiciona notificação ao Firestore para cada usuário alvo
      const notificationsCollection = collection(db, 'notifications');
      const promises = targetUsers.map(async (user) => {
        return addDoc(notificationsCollection, {
          userId: user.id,
          title,
          message,
          read: false,
          timestamp: new Date(),
        });
      });

      await Promise.all(promises);

      res.status(201).json({ message: 'Notificação enviada para todos os usuários elegíveis!' });
    } catch (error) {
      console.error('Erro ao adicionar notificações:', error);
      res.status(500).json({ error: 'Erro ao adicionar notificações.' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}
