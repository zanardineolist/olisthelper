// utils/firebase/firebaseLogging.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function logAction(userId, userName, userRole, action, target, previousData, updatedData) {
  try {
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
    console.log("Log registrado com ID: ", docRef.id);
  } catch (error) {
    console.error("Erro ao registrar log no Firebase:", error);
  }
}
