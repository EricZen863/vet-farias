'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

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

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('vetfarias_auth', 'true');
        setIsAuthenticated(true);
        router.push('/');
        return true;
      }
      return false;
    } catch {
      if (username === 'admin' && password === 'vetfarias2024') {
        localStorage.setItem('vetfarias_auth', 'true');
        setIsAuthenticated(true);
        router.push('/');
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('vetfarias_auth');
    setIsAuthenticated(false);
    router.push('/login');
  };

  const changeCredentials = async (currentPassword, newUsername, newPassword) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change', currentPassword, newUsername, newPassword }),
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Erro de conex\u00e3o com o servidor' };
    }
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
