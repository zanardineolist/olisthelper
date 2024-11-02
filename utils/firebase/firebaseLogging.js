// utils/firebase/firebaseLogging.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function logAction(userId, userName, userRole, action, target, previousData, updatedData) {
  try {
    console.log("Tentando registrar log no Firestore com os seguintes dados:");
    console.log({ userId, userName, userRole, action, target, previousData, updatedData });

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