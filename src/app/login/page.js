'use client';
import { useState, Suspense } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { FiLock, FiUser } from 'react-icons/fi';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'funcionario' ? 'funcionario' : 'admin';
  const initialEmail = searchParams.get('email') || '';

  const [loginType, setLoginType] = useState(initialType);
  const [username, setUsername] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password, loginType);
    if (!result.success) {
      setError(result.error || 'Usuário ou senha inválidos');
    }
    setLoading(false);
  };

  return (
    <div className="login-page" style={{ marginLeft: 'calc(var(--sidebar-width) * -1)' }}>
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-icon">🐾</span>
          <h1>Vet Farias</h1>
          <p>Sistema de Gestão Interna</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            className={`btn-primary ${loginType === 'admin' ? '' : 'btn-outline'}`}
            style={{ flex: 1, padding: '8px', fontSize: '14px', opacity: loginType === 'admin' ? 1 : 0.7 }}
            onClick={() => { setLoginType('admin'); setUsername(''); setPassword(''); setError(''); }}
          >
            Administrador
          </button>
          <button 
            className={`btn-primary ${loginType === 'funcionario' ? '' : 'btn-outline'}`}
            style={{ flex: 1, padding: '8px', fontSize: '14px', opacity: loginType === 'funcionario' ? 1 : 0.7 }}
            onClick={() => { setLoginType('funcionario'); setUsername(''); setPassword(''); setError(''); }}
          >
            Funcionário
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{loginType === 'admin' ? 'Usuário' : 'E-mail'}</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={loginType === 'admin' ? "text" : "email"} 
                className="form-input" 
                placeholder={loginType === 'admin' ? "Digite seu usuário" : "Digite seu e-mail"} 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                style={{ paddingLeft: '40px' }} 
              />
              <FiUser style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input type="password" className="form-input" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '40px' }} />
              <FiLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
