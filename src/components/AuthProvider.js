'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

const DEFAULT_CREDENTIALS = { username: 'admin', password: 'vetfarias2024' };

function getCredentials() {
  if (typeof window === 'undefined') return DEFAULT_CREDENTIALS;
  const saved = localStorage.getItem('vetfarias_credentials');
  if (saved) {
    try { return JSON.parse(saved); } catch { return DEFAULT_CREDENTIALS; }
  }
  return DEFAULT_CREDENTIALS;
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = localStorage.getItem('vetfarias_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = (username, password) => {
    const creds = getCredentials();
    if (username === creds.username && password === creds.password) {
      localStorage.setItem('vetfarias_auth', 'true');
      setIsAuthenticated(true);
      router.push('/');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('vetfarias_auth');
    setIsAuthenticated(false);
    router.push('/login');
  };

  const changeCredentials = (currentPassword, newUsername, newPassword) => {
    const creds = getCredentials();
    if (currentPassword !== creds.password) {
      return { success: false, error: 'Senha atual incorreta' };
    }
    if (!newUsername || newUsername.trim().length < 3) {
      return { success: false, error: 'Novo usu\u00e1rio deve ter pelo menos 3 caracteres' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Nova senha deve ter pelo menos 6 caracteres' };
    }
    const newCreds = { username: newUsername.trim(), password: newPassword };
    localStorage.setItem('vetfarias_credentials', JSON.stringify(newCreds));
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading, changeCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
