import { createContext, useContext, useRef, useCallback } from "react";

interface AIContentActions {
  /** Insert text at end of active content */
  onInsert: (text: string) => void;
  /** Replace entire active content with text */
  onReplace: (text: string) => void;
}

interface AIContentContextValue {
  register: (actions: AIContentActions) => void;
  unregister: () => void;
  insert: (text: string) => void;
  replace: (text: string) => void;
  hasEditor: () => boolean;
}

const AIContentContext = createContext<AIContentContextValue | null>(null);

export function AIContentProvider({ children }: { children: React.ReactNode }) {
  const actionsRef = useRef<AIContentActions | null>(null);

  const register = useCallback((actions: AIContentActions) => {
    actionsRef.current = actions;
  }, []);

  const unregister = useCallback(() => {
    actionsRef.current = null;
  }, []);

  const insert = useCallback((text: string) => {
    actionsRef.current?.onInsert(text);
  }, []);

  const replace = useCallback((text: string) => {
    actionsRef.current?.onReplace(text);
  }, []);

  const hasEditor = useCallback(() => !!actionsRef.current, []);

  return (
    <AIContentContext.Provider value={{ register, unregister, insert, replace, hasEditor }}>
      {children}
    </AIContentContext.Provider>
  );
}

export function useAIContent() {
  const ctx = useContext(AIContentContext);
  if (!ctx) throw new Error("useAIContent must be used within AIContentProvider");
  return ctx;
}
