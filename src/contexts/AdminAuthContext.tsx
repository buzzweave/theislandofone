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
const LOCKOUT_DURATION = 5 * 60 * 1000;

async function hasAdminRole(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.warn("Admin role check failed:", error);
      return false;
    }

    return data?.role === "admin";
  } catch (error) {
    console.warn("Admin role check exception:", error);
    return false;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [failedAttempts, setFailedAttempts] = useState(0);

  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);

  const isLocked = lockoutEnd !== null && Date.now() < lockoutEnd;

  /*
   * ----------------------------------------------------
   * INITIAL ADMIN SESSION CHECK
   * ----------------------------------------------------
   *
   * Supabase is the source of truth for the admin login.
   *
   * This is important because Supabase is also what
   * authorizes database writes for sermons, books, etc.
   *
   * The optional VPS token must NEVER be allowed to
   * destroy a valid Supabase admin session.
   */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn("Unable to read Supabase session:", error);

          if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }

          return;
        }

        if (!session?.user) {
          if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }

          return;
        }

        const admin = await hasAdminRole(session.user.id);

        if (!admin) {
          await supabase.auth.signOut();
          api.clearToken();

          if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }

          return;
        }

        /*
         * Valid Supabase admin session.
         *
         * From this point forward the VPS token is
         * optional. A VPS failure must NOT log the
         * administrator out.
         */

        if (mounted) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }

        /*
         * Check the VPS token if one exists.
         * If it is bad, clear ONLY that token.
         * Keep the Supabase admin session alive.
         */

        if (api.hasToken()) {
          try {
            await api.get("/api/auth/me");
          } catch (error) {
            console.warn("VPS admin token invalid. Supabase session remains active.", error);

            api.clearToken();
          }
        }
      } catch (error) {
        console.error("Admin session initialization failed:", error);

        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    init();

    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  /*
   * ----------------------------------------------------
   * LISTEN FOR SUPABASE AUTH CHANGES
   * ----------------------------------------------------
   *
   * Supabase automatically refreshes its access token.
   *
   * We listen for those changes so the admin interface
   * stays synchronized with the real database session.
   */

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      /*
       * SIGNED_OUT means the real Supabase session
       * ended. In that case the admin should log out.
       */

      if (event === "SIGNED_OUT") {
        api.clearToken();

        if (!cancelled) {
          setIsAuthenticated(false);
        }

        return;
      }

      /*
       * A valid session exists.
       *
       * Do not immediately mark the user authenticated
       * until the admin role has been confirmed.
       */

      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        const admin = await hasAdminRole(session.user.id);

        if (!cancelled) {
          setIsAuthenticated(admin);
        }

        return;
      }

      /*
       * TOKEN_REFRESHED is normal.
       *
       * Do NOT log the administrator out.
       */

      if (event === "TOKEN_REFRESHED" && session?.user) {
        if (!cancelled) {
          setIsAuthenticated(true);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ----------------------------------------------------
   * OPTIONAL VPS TOKEN REFRESH
   * ----------------------------------------------------
   *
   * This used to contain the dangerous behavior:
   *
   * catch {
   *   api.clearToken();
   *   setIsAuthenticated(false);
   * }
   *
   * That meant a VPS refresh failure could throw you
   * out even though Supabase was still logged in.
   *
   * Now VPS failure clears ONLY the VPS token.
   */

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(
      async () => {
        /*
         * If there is no VPS token there is nothing
         * to refresh.
         */

        if (!api.hasToken()) {
          return;
        }

        try {
          const data = await api.post<{
            token: string;
          }>("/api/auth/refresh");

          if (data?.token) {
            api.setToken(data.token);
          }
        } catch (error) {
          console.warn("VPS token refresh failed. Keeping Supabase admin session active.", error);

          /*
           * IMPORTANT:
           *
           * Clear only the optional VPS token.
           *
           * DO NOT:
           *
           * setIsAuthenticated(false)
           *
           * and DO NOT:
           *
           * supabase.auth.signOut()
           */

          api.clearToken();
        }
      },
      4 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  /*
   * ----------------------------------------------------
   * ADMIN LOGIN
   * ----------------------------------------------------
   */

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (isLocked) {
        return false;
      }

      try {
        const cleanEmail = email.trim().toLowerCase();

        /*
         * First establish the Supabase session.
         *
         * This is REQUIRED because Supabase RLS
         * authorizes sermon/database writes.
         */

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError || !authData.user) {
          throw new Error(authError?.message || "Invalid admin credentials");
        }

        /*
         * Confirm this Supabase user actually has
         * the admin role.
         */

        const admin = await hasAdminRole(authData.user.id);

        if (!admin) {
          await supabase.auth.signOut();
          api.clearToken();

          throw new Error("This account does not have admin permission.");
        }

        /*
         * Supabase authentication succeeded.
         *
         * At this point the administrator is allowed
         * into the admin panel.
         */

        setIsAuthenticated(true);
        setFailedAttempts(0);
        setLockoutEnd(null);

        /*
         * VPS authentication is secondary.
         *
         * Try to establish its token, but failure
         * must NOT destroy the valid Supabase login.
         */

        try {
          const data = await api.post<{
            token: string;
          }>("/api/auth/login", {
            email: cleanEmail,
            password,
          });

          if (data?.token) {
            api.setToken(data.token);
          } else {
            api.clearToken();
          }
        } catch (error) {
          console.warn("VPS login unavailable. Supabase admin login remains active.", error);

          api.clearToken();
        }

        return true;
      } catch (error) {
        console.error("Admin login failed:", error);

        /*
         * Make sure a failed login cannot leave behind
         * an old VPS token.
         */

        api.clearToken();

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

  /*
   * ----------------------------------------------------
   * FORGOT PASSWORD
   * ----------------------------------------------------
   *
   * Keep this compatible with the six-digit recovery
   * code screen we already fixed.
   */

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password?admin=1`,
      });

      if (error) {
        console.error("Admin password reset failed:", error);

        return false;
      }

      return true;
    } catch (error) {
      console.error("Admin password reset exception:", error);

      return false;
    }
  }, []);

  /*
   * ----------------------------------------------------
   * LOGOUT
   * ----------------------------------------------------
   */

  const logout = useCallback(() => {
    /*
     * Immediately update the interface.
     */

    setIsAuthenticated(false);

    /*
     * Remove optional VPS token.
     */

    api.clearToken();

    /*
     * End the actual Supabase database session.
     */

    supabase.auth.signOut().catch((error) => {
      console.warn("Supabase logout error:", error);
    });
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        forgotPassword,
        failedAttempts,
        isLocked,
        lockoutEnd,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);

  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }

  return ctx;
}
