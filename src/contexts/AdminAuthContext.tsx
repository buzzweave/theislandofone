import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEnd: number | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const initialCheckDone = useRef(false);

  const isLocked = lockoutEnd !== null && Date.now() < lockoutEnd;

  useEffect(() => {
    let mounted = true;

    const checkAdminRole = async (userId: string): Promise<boolean> => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        return !!data;
      } catch {
        return false;
      }
    };

    // 1. Set up listener first (but skip events until initial check is done)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted || !initialCheckDone.current) return;
      if (session?.user) {
        const isAdmin = await checkAdminRole(session.user.id);
        if (mounted) setIsAuthenticated(isAdmin);
      } else {
        if (mounted) setIsAuthenticated(false);
      }
    });

    // 2. Do initial session check
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const isAdmin = await checkAdminRole(session.user.id);
          if (mounted) setIsAuthenticated(isAdmin);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) {
          initialCheckDone.current = true;
          setIsLoading(false);
        }
      }
    };

    init();

    // Safety timeout - 8 seconds max
    const timeout = setTimeout(() => {
      if (mounted) {
        initialCheckDone.current = true;
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (isLocked) return false;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_DURATION);
        }
        return false;
      }

      // Check admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_DURATION);
        }
        return false;
      }

      setIsAuthenticated(true);
      setFailedAttempts(0);
      setLockoutEnd(null);
      return true;
    },
    [failedAttempts, isLocked],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, failedAttempts, isLocked, lockoutEnd }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
