import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "./firebase-config.functions";

interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  user: User | null;
  ready: boolean;
  error: string | null;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FirebaseContextValue>({
    app: null,
    auth: null,
    db: null,
    user: null,
    ready: false,
    error: null,
  });
  const initedRef = useRef(false);

  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const config = await getFirebaseConfig();
        if (!config.apiKey) {
          throw new Error("Firebase API key is not configured.");
        }
        const app = initializeApp(config);
        const auth = getAuth(app);
        const db = getFirestore(app);

        unsub = onAuthStateChanged(auth, (user) => {
          setState((prev) => ({ ...prev, user, ready: true }));
        });

        setState((prev) => ({ ...prev, app, auth, db, ready: true }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          ready: true,
          error: err instanceof Error ? err.message : "Failed to init Firebase",
        }));
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  return <FirebaseContext.Provider value={state}>{children}</FirebaseContext.Provider>;
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error("useFirebase must be used within FirebaseProvider");
  return ctx;
}
