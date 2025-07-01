export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  createdAt: Date;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Array<{
    path: string;
    message: string;
  }>;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  
  const result: ApiResponse<AuthResponse> = await res.json();
  
  if (!res.ok || !result.success) {
    const errorMessage = result.error || 'Login failed';
    const details = result.details?.map(d => d.message).join(', ');
    throw new Error(details ? `${errorMessage}: ${details}` : errorMessage);
  }
  
  if (!result.data) {
    throw new Error('Invalid response format');
  }
  
  return result.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  
  const result: ApiResponse<AuthResponse> = await res.json();
  
  if (!res.ok || !result.success) {
    const errorMessage = result.error || 'Registration failed';
    const details = result.details?.map(d => d.message).join(', ');
    throw new Error(details ? `${errorMessage}: ${details}` : errorMessage);
  }
  
  if (!result.data) {
    throw new Error('Invalid response format');
  }
  
  return result.data;
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!res.ok) {
    const result: ApiResponse = await res.json();
    throw new Error(result.error || 'Logout failed');
  }
}
