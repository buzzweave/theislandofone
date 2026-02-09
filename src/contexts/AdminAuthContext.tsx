import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  failedAttempts: number;
  isLocked: boolean;
  lockoutEnd: number | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Island0ne!2025";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_auth") === "true";
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);

  const isLocked = lockoutEnd !== null && Date.now() < lockoutEnd;

  const login = useCallback(
    (username: string, password: string): boolean => {
      if (isLocked) return false;

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        setIsAuthenticated(true);
        setFailedAttempts(0);
        setLockoutEnd(null);
        sessionStorage.setItem("admin_auth", "true");
        return true;
      }

      const next = failedAttempts + 1;
      setFailedAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setLockoutEnd(Date.now() + LOCKOUT_DURATION);
      }
      return false;
    },
    [failedAttempts, isLocked],
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_auth");
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ isAuthenticated, login, logout, failedAttempts, isLocked, lockoutEnd }}
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
