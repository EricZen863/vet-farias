'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = localStorage.getItem('vetfarias_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      setUserType(localStorage.getItem('vetfarias_userType') || 'admin');
      try {
        const storedUser = localStorage.getItem('vetfarias_user');
        if (storedUser) setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/login' && pathname !== '/login-qrcode') {
      router.push('/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = async (username, password, type = 'admin') => {
    try {
      const action = type === 'admin' ? 'login' : 'loginFuncionario';
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('vetfarias_auth', 'true');
        localStorage.setItem('vetfarias_userType', type);
        setUserType(type);
        if (data.user) {
          localStorage.setItem('vetfarias_user', JSON.stringify(data.user));
          setUser(data.user);
        }
        setIsAuthenticated(true);
        router.push(type === 'admin' ? '/' : '/checkin');
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      if (type === 'admin' && username === 'admin' && password === 'vetfarias2024') {
        localStorage.setItem('vetfarias_auth', 'true');
        localStorage.setItem('vetfarias_userType', 'admin');
        setUserType('admin');
        setIsAuthenticated(true);
        router.push('/');
        return { success: true };
      }
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const logout = () => {
    localStorage.removeItem('vetfarias_auth');
    localStorage.removeItem('vetfarias_userType');
    localStorage.removeItem('vetfarias_user');
    setIsAuthenticated(false);
    setUserType(null);
    setUser(null);
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
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userType, user, login, logout, loading, changeCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
