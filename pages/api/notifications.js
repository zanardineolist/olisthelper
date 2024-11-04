// pages/api/notifications.js
import { db } from '../../utils/firebase/firebaseConfig';
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userId, title, message } = req.body;

      if (!userId || !title || !message) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      }

      // Adiciona notificação ao Firestore
      const notificationsCollection = collection(db, 'notifications');
      const docRef = await addDoc(notificationsCollection, {
        userId,
        title,
        message,
        read: false,
        timestamp: new Date(),
      });

      res.status(201).json({ id: docRef.id, message: 'Notificação adicionada com sucesso!' });
    } catch (error) {
      console.error('Erro ao adicionar notificação:', error);
      res.status(500).json({ error: 'Erro ao adicionar notificação.' });
    }
  } else if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
      }

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
