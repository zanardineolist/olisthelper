// utils/firebase/firebaseLogging.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function logAction(userId, userName, userRole, action, target, previousData, updatedData) {
  try {
    if (!userId || !userName || !userRole) {
      console.error("Dados do usuário faltando ao tentar registrar log:", { userId, userName, userRole });
      return;
    }

    const docRef = await addDoc(collection(db, "logs"), {
      userId,
      userName,
      userRole,
      action,
      target,
      previousData,
      updatedData,
      timestamp: serverTimestamp(),
    });

    console.log("Log registrado com sucesso com ID:", docRef.id);
  } catch (error) {
    console.error("Erro ao registrar log no Firebase:", error);
  }
}
