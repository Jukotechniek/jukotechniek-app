
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'technician' | 'opdrachtgever';
  fullName: string;
  createdAt: string;
  customer?: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
