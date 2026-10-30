
import {
  AuthResponse,
  LoginFormData,
  User,
} from "../types/auth.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
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

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const rawMessage = data?.message;
    const message =
      (Array.isArray(rawMessage) ? rawMessage.join(", ") : rawMessage) ||
      data?.error ||
      `Yêu cầu thất bại với mã lỗi ${res.status}`;

    throw new ApiError(message, res.status);
  }

  return data as T;
}

async function authenticatedRequest<T>(
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
