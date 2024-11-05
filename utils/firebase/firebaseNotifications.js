// utils/firebase/firebaseNotifications.js
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Função para adicionar uma notificação ao Firestore
export async function addNotification(userId, title, message) {
  try {
    if (!userId || !title || !message) {
      console.error("Dados faltando ao tentar adicionar notificação:", { userId, title, message });
      throw new Error("Dados insuficientes para adicionar notificação.");
    }

    const notificationsCollection = collection(db, "notifications");
    const docRef = await addDoc(notificationsCollection, {
      userId,
      title,
      message,
      read: false,
      timestamp: new Date().getTime(), // Salva como milissegundos
    });

    console.log(`Notificação adicionada com sucesso com ID: ${docRef.id}`);
  } catch (error) {
    console.error("Erro ao adicionar notificação no Firebase:", error);
    throw new Error("Erro ao adicionar notificação no Firebase.");
  }
}

// Função para buscar as notificações do usuário
export async function getUserNotifications(userId) {
  try {
    if (!userId) {
      console.error("ID do usuário faltando ao tentar buscar notificações.");
      return [];
    }

    const notificationsCollection = collection(db, "notifications");
    const q = query(notificationsCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar notificações no Firebase:", error);
    return [];
  }
}

// Função para marcar uma notificação como lida
export async function markNotificationAsRead(notificationId) {
  try {
    if (!notificationId) {
      console.error("ID da notificação faltando ao tentar marcar como lida.");
      return;
    }

    const notificationDoc = doc(db, "notifications", notificationId);
    await updateDoc(notificationDoc, { read: true });

    console.log(`Notificação com ID ${notificationId} marcada como lida.`);
  } catch (error) {
    console.error("Erro ao marcar notificação como lida no Firebase:", error);
  }
}
