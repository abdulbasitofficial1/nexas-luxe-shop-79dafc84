import { createServerFn } from "@tanstack/react-start";

export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    apiKey: "AIzaSyD7h3pPJf5AXRHLm-41I2ElO9TIh6Uw2UY",
    authDomain: "nexastore-cc43d.firebaseapp.com",
    projectId: "nexastore-cc43d",
    storageBucket: "nexastore-cc43d.firebasestorage.app",
    messagingSenderId: "945656330436",
    appId: "1:945656330436:web:a7fc52c9acbcb4071df191",
    measurementId: "G-CGQ1XTXJ66",
  };
});
