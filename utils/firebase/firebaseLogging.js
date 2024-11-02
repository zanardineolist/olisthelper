// utils/firebase/firebaseLogging.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function logAction(userId, userName, userRole, action, target, previousData, updatedData) {
  try {
    await addDoc(collection(db, "logs"), {
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
