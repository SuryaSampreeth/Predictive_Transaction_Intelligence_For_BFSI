import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type UserRole = "Admin" | "Analyst" | "Manager" | "User";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
  permissions: string[];
  lastLogin: string;
}

interface LoginPayload {
  username: string;
  employeeId: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthenticatedUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const rolePermissions: Record<UserRole, string[]> = {
  Admin: ["manage-users", "view-analytics", "tune-models", "override-alerts", "view-all-transactions"],
  Analyst: ["view-analytics", "investigate", "create-cases", "view-all-transactions"],
  Manager: ["view-analytics", "approve-cases", "assign-cases", "view-all-transactions"],
  User: ["submit-transaction", "view-own-transactions"],
};

const STORAGE_KEY = "transintelliflow:user";

// Safe localStorage helper to prevent errors in restricted contexts
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      console.warn('localStorage access denied');
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn('localStorage access denied');
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn('localStorage access denied');
    }
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        console.warn("Failed to parse stored user", error);
        safeLocalStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = async ({ username, employeeId, role }: LoginPayload) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const profile: AuthenticatedUser = {
      id: employeeId || username,
      name: username,
      role,
      permissions: rolePermissions[role] ?? [],
      lastLogin: new Date().toISOString(),
    };
    setUser(profile);
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return profile;
  };

  const logout = () => {
    setUser(null);
    safeLocalStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
