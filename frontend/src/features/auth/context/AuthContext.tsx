"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User,
  LoginFormData,
  RegisterFormData,
  AuthState,
} from "../types/auth.types";
import { loginApi, registerApi, getMeApi, ApiError } from "../api/auth.api";

interface AuthContextType extends AuthState {
  login: (data: LoginFormData) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (data: RegisterFormData) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = "haisan_express_user";
const STORAGE_KEY_TOKEN = "haisan_express_token";

/**
 * Synchronize authentication tokens with document cookies for middleware access.
 */
function setAuthCookies(token: string, role: string, rememberMe = true) {
  if (typeof document === "undefined") return;
  const maxAge = rememberMe ? 604800 : 86400; // 7 days or 1 day
  document.cookie = `haisan_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `haisan_role=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Clear authentication cookies on logout or session expiration.
 */
function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = "haisan_token=; path=/; max-age=0; SameSite=Lax";
  document.cookie = "haisan_role=; path=/; max-age=0; SameSite=Lax";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken =
          localStorage.getItem(STORAGE_KEY_TOKEN) ||
          sessionStorage.getItem(STORAGE_KEY_TOKEN);
        const storedUser =
          localStorage.getItem(STORAGE_KEY_USER) ||
          sessionStorage.getItem(STORAGE_KEY_USER);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setAccessToken(storedToken);
          setAuthCookies(storedToken, parsedUser.role || "CUSTOMER", true);

          // Verify token with backend in background
          try {
            const freshUser = await getMeApi(storedToken);
            setUser(freshUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshUser));
            setAuthCookies(storedToken, freshUser.role || "CUSTOMER", true);
          } catch (e) {
            if (e instanceof ApiError && e.statusCode === 401) {
              // Token expired, clear storage and cookies
              localStorage.removeItem(STORAGE_KEY_USER);
              localStorage.removeItem(STORAGE_KEY_TOKEN);
              sessionStorage.removeItem(STORAGE_KEY_USER);
              sessionStorage.removeItem(STORAGE_KEY_TOKEN);
              clearAuthCookies();
              setUser(null);
              setAccessToken(null);
            }
          }
        }
      } catch {
        // Ignore parse error
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (
    data: LoginFormData,
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);
    try {
      const response = await loginApi(data);
      const { user: authUser, accessToken: token } = response;

      setUser(authUser);
      setAccessToken(token);

      const storage = data.rememberMe ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
      storage.setItem(STORAGE_KEY_TOKEN, token);
      setAuthCookies(token, authUser.role || "CUSTOMER", data.rememberMe ?? true);

      return { success: true, user: authUser };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Đăng nhập không thành công. Vui lòng kiểm tra lại.";
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    data: RegisterFormData,
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);
    try {
      const response = await registerApi({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      const { user: authUser, accessToken: token } = response;
      setUser(authUser);
      setAccessToken(token);

      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      setAuthCookies(token, authUser.role || "CUSTOMER", true);

      return { success: true, user: authUser };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Đăng ký không thành công. Vui lòng thử lại.";
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_USER);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    clearAuthCookies();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
