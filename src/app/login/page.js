'use client';
import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { FiLock, FiUser } from 'react-icons/fi';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await login(username, password);
    if (!success) {
      setError('Usuário ou senha inválidos');
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
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="form-input" placeholder="Digite seu usuário" value={username} onChange={(e) => setUsername(e.target.value)} style={{ paddingLeft: '40px' }} />
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
