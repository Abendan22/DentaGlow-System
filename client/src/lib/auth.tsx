"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiGet,
  apiPost,
  clearToken,
  getStoredUser,
  setStoredUser,
  setToken,
} from "./api";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender_id: number;
  barangay: string;
  address?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitialUser(): User | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  return token ? getStoredUser<User>() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiGet<{ user: User }>("/user");
      setUser(data.user);
      setStoredUser(data.user);
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await apiPost<{ user: User; token: string }>("/login", {
      email,
      password,
    });
    setToken(data.token);
    setStoredUser(data.user);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData: RegisterData) => {
    const data = await apiPost<{ user: User; token: string }>(
      "/register",
      formData
    );
    setToken(data.token);
    setStoredUser(data.user);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiPost("/logout", {});
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function getRedirectPath(role: User["role"]): string {
  if (role === "patient") return "/portal";
  return "/admin/dashboard";
}

/** Redirect logged-in users away from login/register pages */
export function useAuthRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(getRedirectPath(user.role));
  }, [user, loading, router]);

  return { user, loading };
}
