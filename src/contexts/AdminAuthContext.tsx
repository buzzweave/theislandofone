import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
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

async function hasAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.warn("Admin role check failed", error);
    return false;
  }

  return data?.role === "admin";
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);

  const isLocked = lockoutEnd !== null && Date.now() < lockoutEnd;

  // Check session on mount via VPS
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      let authenticated = false;

      try {
        if (api.hasToken()) {
          await api.get("/api/auth/me");
          authenticated = true;
        }
      } catch {
        api.clearToken();
      }

      if (!authenticated) {
        const { data } = await supabase.auth.getUser();
        if (data.user) authenticated = await hasAdminRole(data.user.id);
      }

      if (mounted) setIsAuthenticated(authenticated);
      if (mounted) setIsLoading(false);
    };

    init();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // Token refresh every 4 minutes
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.post<{ token: string }>("/api/auth/refresh");
        if (data?.token) api.setToken(data.token);
      } catch {
        api.clearToken();
        setIsAuthenticated(false);
      }
    }, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (isLocked) return false;
      try {
        let authenticated = false;

        try {
          const data = await api.post<{ token: string }>("/api/auth/login", { email, password });
          if (data?.token) {
            api.setToken(data.token);
            authenticated = true;
          }
        } catch {
          api.clearToken();
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (!authError && authData.user) {
          authenticated = await hasAdminRole(authData.user.id);
          if (!authenticated) await supabase.auth.signOut();
        }

        if (!authenticated) throw new Error("Invalid admin credentials");

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
      await api.post("/api/auth/forgot-password", { email });
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setIsAuthenticated(false);
    supabase.auth.signOut().catch(() => {});
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
