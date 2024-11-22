import { db } from '../../utils/firebase/firebaseConfig';
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getSheetValues } from '../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { title, message, profiles, notificationType } = req.body;

      if (!title || !message || !profiles || profiles.length === 0 || !notificationType) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios e ao menos um perfil deve ser selecionado.' });
      }

      // Log para depuração
      console.log('Perfis selecionados:', profiles);
      console.log('Tipo de notificação selecionado:', notificationType);

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

      // Log para depuração dos usuários-alvo
      console.log('Usuários elegíveis encontrados:', targetUsers);

      if (targetUsers.length === 0) {
        return res.status(400).json({ error: 'Nenhum usuário elegível encontrado. Verifique os perfis selecionados.' });
      }

      // Adiciona notificação ao Firestore para cada usuário alvo
      const notificationsCollection = collection(db, 'notifications');
      const promises = targetUsers.map(async (user) => {
        const [userId, userName, userEmail] = user;

        try {
          return await addDoc(notificationsCollection, {
            userId,
            userEmail,
            title,
            message,
            read: false,
            timestamp: new Date().getTime(), // Salva como milissegundos
            notificationType, // Novo campo para identificar o tipo da notificação (sino, topo ou ambos)
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