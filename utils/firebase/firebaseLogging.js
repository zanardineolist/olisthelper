// utils/firebase/firebaseLogging.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function logAction(userId, userName, userRole, action, target, previousData, updatedData, endpointName) {
  try {
    if (!userId || !userName || !userRole || !endpointName) {
      console.error("Dados do usuário ou nome do endpoint faltando ao tentar registrar log:", { userId, userName, userRole, endpointName });
      return;
    }



    // Cria uma coleção específica para o endpoint
    const logsCollection = collection(db, `logs_${endpointName}`);
    const docRef = await addDoc(logsCollection, {
      userId,
      userName,
      userRole,
      action,
      target,
      previousData,
      updatedData,
      timestamp: serverTimestamp(),
    });


  } catch (error) {
    console.error("Erro ao registrar log no Firebase:", error);
  }
}