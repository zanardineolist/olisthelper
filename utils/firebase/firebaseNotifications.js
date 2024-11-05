// utils/firebase/firebaseNotifications.js
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Função para adicionar uma notificação ao Firestore
export async function addNotification(userId, title, message) {
  try {
    if (!userId || !title || !message) {
      throw new Error("Dados insuficientes para adicionar notificação.");
    }

    const notificationsCollection = collection(db, "notifications");
    await addDoc(notificationsCollection, {
      userId,
      title,
      message,
      read: false,
      timestamp: new Date().getTime(),
    });

  } catch (error) {
    throw new Error("Erro ao adicionar notificação no Firebase.");
  }
}

// Função para buscar as notificações do usuário
export async function getUserNotifications(userId) {
  try {
    if (!userId) {
      return [];
    }

    const notificationsCollection = collection(db, "notifications");
    const q = query(notificationsCollection, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    return [];
  }
}

// Função para marcar uma notificação como lida
export async function markNotificationAsRead(notificationId) {
  try {
    if (!notificationId) {
      return;
    }

    const notificationDoc = doc(db, "notifications", notificationId);
    await updateDoc(notificationDoc, { read: true });

  } catch (error) {
    throw new Error("Erro ao marcar notificação como lida no Firebase.");
  }
}
