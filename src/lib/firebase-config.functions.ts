import { createServerFn } from "@tanstack/react-start";

/**
 * Firebase web config. The apiKey is a publishable client key (safe for the
 * browser) and is read from the GOOGLE_API_KEY secret at request time. All
 * other fields are public project identifiers.
 */
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    apiKey: (process.env.GOOGLE_API_KEY ?? "").trim(),
    authDomain: "nexastore-cc43d.firebaseapp.com",
    projectId: "nexastore-cc43d",
    storageBucket: "nexastore-cc43d.firebasestorage.app",
    messagingSenderId: "945656330436",
    appId: "1:945656330436:web:a7fc52c9acbcb4071df191",
    measurementId: "G-CGQ1XTXJ66",
  };
});
