
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'technician';
  fullName: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
