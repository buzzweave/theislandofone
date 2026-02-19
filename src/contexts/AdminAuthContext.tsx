import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEnd: number | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

async function checkAdminRole(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  return data === true;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);

  const isLocked = lockoutEnd !== null && Date.now() < lockoutEnd;

  // Check session on mount + listen for auth changes
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdmin = await checkAdminRole(session.user.id);
        if (mounted) setIsAuthenticated(isAdmin);
      }
      if (mounted) setIsLoading(false);
    };

    // Set up listener BEFORE getSession per Supabase best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const isAdmin = await checkAdminRole(session.user.id);
        if (mounted) setIsAuthenticated(isAdmin);
      } else {
        if (mounted) setIsAuthenticated(false);
      }
    });

    init();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (isLocked) return false;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) throw new Error(error?.message || "Login failed");

        // Verify admin role
        const isAdmin = await checkAdminRole(data.user.id);
        if (!isAdmin) {
          await supabase.auth.signOut();
          throw new Error("Not an admin");
        }

        setIsAuthenticated(true);
        setFailedAttempts(0);
        setLockoutEnd(null);
        return true;
      } catch {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_DURATION);
        }
        return false;
      }
    },
    [failedAttempts, isLocked],
  );

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return !error;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, forgotPassword, failedAttempts, isLocked, lockoutEnd }}
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
