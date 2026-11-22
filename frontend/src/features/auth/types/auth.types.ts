export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  status?: string;
  createdAt?: string;
  // Aliases for header and backwards compatibility
  name?: string;
  emailOrPhone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginFormData {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
