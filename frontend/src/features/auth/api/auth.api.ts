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

export async function loginApi(data: LoginFormData): Promise<AuthResponse> {
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
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const user = await handleResponse<User>(response);
  return {
    ...user,
    name: user.fullName,
    emailOrPhone: user.phone || user.email,
  };
}
