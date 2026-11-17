"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  User,
  LoginFormData,
  RegisterFormData,
  AuthState,
  AuthResponse,
} from "../types/auth.types";

import {
  loginApi,
  adminLoginApi,
  registerApi,
  getMeApi,
  ApiError,
  setUnauthorizedHandler
} from "../api/auth.api";

interface AuthContextType extends AuthState {
  login: (
    data: LoginFormData,
  ) => Promise<{ success: boolean; error?: string; user?: User }>;

  register: (
    data: RegisterFormData,
  ) => Promise<{ success: boolean; error?: string; user?: User }>;

  /** Sign in to the admin site. Rejects every account that is not an ADMIN. */
  loginAdmin: (
    data: LoginFormData,
  ) => Promise<{ success: boolean; error?: string; user?: User }>;

  logout: () => void;

  /** Merge profile changes into the signed-in user, e.g. after editing the profile. */
  updateUser: (changes: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = "haisan_express_user";
const STORAGE_KEY_TOKEN = "haisan_express_token";

const COOKIE_TOKEN = "haisan_token";
const COOKIE_ROLE = "haisan_role";

const REMEMBER_MAX_AGE = 7 * 24 * 60 * 60;
const SESSION_MAX_AGE = 24 * 60 * 60;

const VALID_ROLES = ["CUSTOMER", "VENDOR", "ADMIN"] as const;

function isValidRole(
  role: unknown,
): role is (typeof VALID_ROLES)[number] {
  return (
    typeof role === "string" &&
    VALID_ROLES.some((validRole) => validRole === role)
  );
}

/**
 * Synchronize authentication cookies used by the Next.js proxy.
 *
 * Note: These cookies are JavaScript-readable and are not HttpOnly.
 * They must not replace backend token verification or authorization.
 */
function setAuthCookies(
  token: string,
  role: string,
  rememberMe: boolean,
): void {
  if (typeof document === "undefined") return;

  const maxAge = rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;

  document.cookie =
    `${COOKIE_TOKEN}=${encodeURIComponent(token)}; ` +
    `Path=/; Max-Age=${maxAge}; SameSite=Lax`;

  document.cookie =
    `${COOKIE_ROLE}=${encodeURIComponent(role)}; ` +
    `Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/**
 * Remove authentication cookies.
 */
function clearAuthCookies(): void {
  if (typeof document === "undefined") return;

  document.cookie =
    `${COOKIE_TOKEN}=; Path=/; Max-Age=0; SameSite=Lax`;

  document.cookie =
    `${COOKIE_ROLE}=; Path=/; Max-Age=0; SameSite=Lax`;
}


/**
 * Remove authentication data from persistent storage, session storage,
 * and the cookies used by the frontend proxy.
 *
 * Storage cleanup is best-effort: an unavailable storage API must not
 * prevent the in-memory authentication state from being reset.
 */
function clearStoredAuth(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch {
      // Persistent storage may be unavailable.
    }

    try {
      sessionStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch {
      // Session storage may be unavailable.
    }
  }

  clearAuthCookies();
}

/**
 * Persist the authentication session according to rememberMe.
 */
function persistAuth(
  user: User,
  token: string,
  rememberMe: boolean,
): void {
  clearStoredAuth();

  const storage =
    rememberMe ? localStorage : sessionStorage;

  storage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  storage.setItem(STORAGE_KEY_TOKEN, token);

  setAuthCookies(token, user.role || "CUSTOMER", rememberMe);
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Reset authentication state and persisted credentials.
   */
  const logout = useCallback((): void => {
    setUser(null);
    setAccessToken(null);
    clearStoredAuth();
  }, []);

  /**
   * Merge profile changes into the signed-in user and the stored session, so
   * the header shows the new name without signing in again.
   */
  const updateUser = useCallback((changes: Partial<User>): void => {
    setUser((current) => {
      if (!current) return current;

      const next: User = { ...current, ...changes };
      next.name = next.fullName;
      next.emailOrPhone = next.phone || next.email;

      for (const storage of [localStorage, sessionStorage]) {
        try {
          // Only the storage that holds the session is updated.
          if (storage.getItem(STORAGE_KEY_TOKEN)) {
            storage.setItem(STORAGE_KEY_USER, JSON.stringify(next));
          }
        } catch {
          // Storage may be unavailable; the in-memory user is still updated.
        }
      }
      return next;
    });
  }, []);

  /**
   * Restore the session only after the backend validates the stored token.
   */

  useEffect(() => {
    setUnauthorizedHandler(logout);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async (): Promise<void> => {
      try {
        // Prefer a complete persistent session.
        const localToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        const localUser = localStorage.getItem(STORAGE_KEY_USER);

        // Otherwise, use a complete browser-session session.
        const sessionToken = sessionStorage.getItem(STORAGE_KEY_TOKEN);
        const sessionUser = sessionStorage.getItem(STORAGE_KEY_USER);

        let storedToken: string | null = null;
        let storedUser: string | null = null;
        let rememberMe = false;

        if (localToken && localUser) {
          storedToken = localToken;
          storedUser = localUser;
          rememberMe = true;
        } else if (sessionToken && sessionUser) {
          storedToken = sessionToken;
          storedUser = sessionUser;
          rememberMe = false;
        }

        // No complete session exists.
        if (!storedToken || !storedUser) {
          clearStoredAuth();

          if (!cancelled) {
            setUser(null);
            setAccessToken(null);
          }

          return;
        }

        // Validate cached data before contacting the backend.
        const parsedUser: unknown = JSON.parse(storedUser);

        if (
          !parsedUser ||
          typeof parsedUser !== "object" ||
          !("id" in parsedUser) ||
          !("role" in parsedUser)
        ) {
          clearStoredAuth();

          if (!cancelled) {
            setUser(null);
            setAccessToken(null);
          }

          return;
        }

        // Do not expose cached authentication state before validation.
        const freshUser = await getMeApi(storedToken);

        if (cancelled) return;

        if (!freshUser?.id || !isValidRole(freshUser.role)) {
          throw new Error("Dữ liệu người dùng trả về không hợp lệ.");
        }

        // Preserve the original storage duration.
        persistAuth(freshUser, storedToken, rememberMe);

        setUser(freshUser);
        setAccessToken(storedToken);
      } catch (error: unknown) {
        if (cancelled) return;

        // An invalid, expired, or unverifiable session must not remain
        // authenticated in the client.
        clearStoredAuth();
        setUser(null);
        setAccessToken(null);

        if (error instanceof ApiError && error.statusCode !== 401) {
          console.error(
            "Unable to restore authentication session.",
            error.statusCode,
          );
        } else if (!(error instanceof ApiError)) {
          // Avoid logging tokens, credentials, or response payloads.
          console.error("Unable to restore authentication session.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Authenticate with the given sign-in call and persist the resulting session.
   */
  const authenticate = async (
    signIn: (data: LoginFormData) => Promise<AuthResponse>,
    data: LoginFormData,
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true);

    try {
      const response = await signIn(data);
      const { user: authUser, accessToken: token } = response;

      if (!authUser || !token) {
        throw new Error("Phản hồi đăng nhập không hợp lệ.");
      }

      const rememberMe = data.rememberMe ?? false;

      persistAuth(authUser, token, rememberMe);

      setUser(authUser);
      setAccessToken(token);

      return {
        success: true,
        user: authUser,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Đăng nhập không thành công. Vui lòng thử lại.";

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const login = (data: LoginFormData) => authenticate(loginApi, data);

  // Admin sessions last only until the browser closes; the token is short-lived anyway.
  const loginAdmin = (data: LoginFormData) =>
    authenticate(adminLoginApi, { ...data, rememberMe: false });

  /**
   * Register a new account and establish its session.
   */
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

      if (!authUser || !token) {
        throw new Error("Phản hồi đăng ký không hợp lệ.");
      }

      persistAuth(authUser, token, true);

      setUser(authUser);
      setAccessToken(token);

      return {
        success: true,
        user: authUser,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Đăng ký không thành công. Vui lòng thử lại.";

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: Boolean(user && accessToken),
        isLoading,
        login,
        loginAdmin,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}