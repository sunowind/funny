export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: User;
  message: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const err: any = await res.json();
    throw new Error(err.error || '登录失败');
  }
  return res.json();
}
