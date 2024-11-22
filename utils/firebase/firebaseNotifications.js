// utils/firebase/firebaseNotifications.js
import { collection, setDoc, getDocs, query, where, updateDoc, doc, writeBatch, limit } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Função para adicionar uma notificação ao Firestore
export async function addNotification(userId, title, message, notificationType = 'bell', userRole) {
  try {
    if (!userId || !title || !message || !userRole) {
      throw new Error("Dados insuficientes para adicionar notificação.");
    }

    // Gerar um identificador personalizado (customId) para a notificação
    const normalizedTitle = title.replace(/\s+/g, '_').toLowerCase();
    const customId = `${notificationType}_${normalizedTitle}_${userId}_notify`;

    // Define o documento de notificação usando customId como identificador
    const notificationDoc = doc(db, "notifications", customId);
    await setDoc(notificationDoc, {
      userId,
      title,
      message,
      userRole, // Adicionando o perfil do usuário à notificação
      read: false,
      timestamp: new Date().getTime(),
      notificationType,
    });

  } catch (error) {
    throw new Error("Erro ao adicionar notificação no Firebase.");
  }
}

// Função para buscar as notificações do usuário com base no userId e userRole
export async function getUserNotifications(userId, userRole, limitNumber = 10) {
  try {
    if (!userId || !userRole) {
      return [];
    }

    const notificationsCollection = collection(db, "notifications");
    const q = query(
      notificationsCollection,
      where("userId", "==", userId),
      where("userRole", "==", userRole),
      limit(limitNumber)
    );
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

// Função para marcar múltiplas notificações como lidas
export async function markMultipleNotificationsAsRead(notificationIds) {
  if (!notificationIds || notificationIds.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  notificationIds.forEach((id) => {
    const notificationRef = doc(db, "notifications", id);
    batch.update(notificationRef, { read: true });
  });

  try {
    await batch.commit();
  } catch (error) {
    throw new Error("Erro ao marcar notificações como lidas no Firebase.");
  }
}
