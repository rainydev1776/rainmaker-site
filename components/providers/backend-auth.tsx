"use client";

import { createContext, useContext } from "react";

type BackendAuthContextValue = {
  backendAuthed: boolean;
};

const BackendAuthContext = createContext<BackendAuthContextValue>({
  backendAuthed: false,
});

export function BackendAuthProvider({
  backendAuthed,
  children,
}: {
  backendAuthed: boolean;
  children: React.ReactNode;
}) {
  return (
    <BackendAuthContext.Provider value={{ backendAuthed }}>
      {children}
    </BackendAuthContext.Provider>
  );
}

export function useBackendAuth() {
  return useContext(BackendAuthContext);
}
