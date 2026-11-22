
import {
  AuthResponse,
  LoginFormData,
  User,
} from "../types/auth.types";

import { API_BASE_URL } from "@/lib/api-base";

export class ApiError extends Error {
  statusCode: number;
  /** Each message the API returned; validation errors (400) send one per invalid field. */
  messages: string[];

  constructor(message: string, statusCode: number, messages: string[] = [message]) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.messages = messages;
  }
}

/**
 * Callback invoked when an authenticated API request returns 401.
 * AuthContext registers this callback to clear stale client auth state.
 */
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler;
}

export async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const rawMessage = data?.message;
    const message =
      (Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage) ||
      data?.error ||
      `Yêu cầu thất bại với mã lỗi ${res.status}`;

    const messages = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === "string")
      : [message];

    throw new ApiError(message, res.status, messages);
  }

  return data as T;
}

/**
 * Request an API endpoint with the bearer token. A 401 response logs the
 * user out through the registered handler.
 */
export async function authenticatedRequest<T>(
  url: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  return handleResponse<T>(response);
}

export async function registerApi(data: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || undefined,
      password: data.password,
    }),
  });

  const result = await handleResponse<AuthResponse>(response);

  return {
    ...result,
    user: {
      ...result.user,
      name: result.user.fullName,
      emailOrPhone: result.user.phone || result.user.email,
    },
  };
}

export async function loginApi(
  data: LoginFormData,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailOrPhone: data.emailOrPhone,
      password: data.password,
    }),
  });

  const result = await handleResponse<AuthResponse>(response);

  return {
    ...result,
    user: {
      ...result.user,
      name: result.user.fullName,
      emailOrPhone: result.user.phone || result.user.email,
    },
  };
}

export async function getMeApi(token: string): Promise<User> {
  const user = await authenticatedRequest<User>(
    `${API_BASE_URL}/auth/me`,
    token,
  );

  return {
    ...user,
    name: user.fullName,
    emailOrPhone: user.phone || user.email,
  };
}

/**
 * Sign in to the admin site. Only ADMIN accounts succeed; the backend answers
 * every other case with the same message, and with 429 after repeated failures.
 */
export async function adminLoginApi(
  data: LoginFormData,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailOrPhone: data.emailOrPhone,
      password: data.password,
    }),
  });

  const result = await handleResponse<AuthResponse>(response);

  return {
    ...result,
    user: {
      ...result.user,
      name: result.user.fullName,
      emailOrPhone: result.user.phone || result.user.email,
    },
  };
}
