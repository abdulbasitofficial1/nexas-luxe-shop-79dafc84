import { createContext, useContext, useState, type ReactNode } from "react";

interface UIContextValue {
  adminLoginOpen: boolean;
  openAdminLogin: () => void;
  closeAdminLogin: () => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  return (
    <UIContext.Provider
      value={{
        adminLoginOpen,
        openAdminLogin: () => setAdminLoginOpen(true),
        closeAdminLogin: () => setAdminLoginOpen(false),
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
