'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

const CREDENTIALS = { username: 'admin', password: 'vetfarias2024' };

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
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
