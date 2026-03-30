'use client';
import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { FiLock, FiUser, FiCheck, FiAlertCircle, FiTrash2 } from 'react-icons/fi';

export default function ConfiguracoesPage() {
  const { isAuthenticated, loading, changeCredentials } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState(null);
  const [cleaning, setCleaning] = useState(false);

  if (loading || !isAuthenticated) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!currentPassword) { setStatus({ type: 'error', message: 'Digite sua senha atual' }); return; }
    if (!newUsername && !newPassword) { setStatus({ type: 'error', message: 'Preencha pelo menos o novo usuário ou nova senha' }); return; }
    if (newPassword && newPassword !== confirmPassword) { setStatus({ type: 'error', message: 'As senhas não conferem' }); return; }

    setSaving(true);
    const result = await changeCredentials(
      currentPassword,
      newUsername || undefined,
      newPassword || currentPassword
    );
    setSaving(false);

    if (result.success) {
      setStatus({ type: 'success', message: 'Credenciais atualizadas com sucesso!' });
      setCurrentPassword(''); setNewUsername(''); setNewPassword(''); setConfirmPassword('');
    } else {
      setStatus({ type: 'error', message: result.error });
    }
  };

  const handleCleanup = async () => {
    const now = new Date();
    const cutoffYear = now.getFullYear() - 4;
    const confirmMsg = `Tem certeza? Isso vai apagar PERMANENTEMENTE todos os registros anteriores a ${cutoffYear}. Esta ação não pode ser desfeita.`;
    if (!window.confirm(confirmMsg)) return;

    setCleaning(true);
    setCleanupStatus(null);
    try {
      const res = await fetch('/api/records?action=cleanup', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCleanupStatus({ type: 'success', message: `Limpeza concluída! Registros anteriores a ${data.cutoffKey} foram removidos.` });
      } else {
        setCleanupStatus({ type: 'error', message: 'Erro ao realizar a limpeza.' });
      }
    } catch {
      setCleanupStatus({ type: 'error', message: 'Erro de conexão ao realizar a limpeza.' });
    }
    setCleaning(false);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie suas credenciais de acesso</p>
      </div>

      <div className="card" style={{ maxWidth: '520px', marginBottom: '24px' }}>
        <h2 className="card-title"><FiLock size={18} /> Alterar Login e Senha</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Senha Atual *</label>
            <div style={{ position: 'relative' }}>
              <input type="password" className="form-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Digite sua senha atual" style={{ paddingLeft: '40px' }} />
              <FiLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          <div className="form-group">
            <label className="form-label">Novo Usuário</label>
            <div style={{ position: 'relative' }}>
              <input type="text" className="form-input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Deixe vazio para manter o atual" style={{ paddingLeft: '40px' }} />
              <FiUser style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe vazio para manter a atual" style={{ paddingLeft: '40px' }} />
              <FiLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" style={{ paddingLeft: '40px' }} />
              <FiLock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            </div>
          </div>
          {status && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', background: status.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: status.type === 'success' ? 'var(--success)' : 'var(--danger)', border: `1px solid ${status.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}` }}>
              {status.type === 'success' ? <FiCheck size={16} /> : <FiAlertCircle size={16} />}
              {status.message}
            </div>
          )}
          <button type="submit" className="btn-primary" style={{ marginTop: '4px' }} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px', lineHeight: '1.6' }}>
          💡 As credenciais padrão são <strong>admin / vetfarias2024</strong>. Caso esqueça suas credenciais alteradas, entre em contato com o administrador do sistema.
        </p>
      </div>

      <div className="card" style={{ maxWidth: '520px' }}>
        <h2 className="card-title"><FiTrash2 size={18} /> Manutenção do Banco de Dados</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
          Remove permanentemente todos os registros com mais de <strong>4 anos</strong> de todas as seções do sistema (Laboratório, Cirurgiões, Imagem, Gastos e Maquinetas).
        </p>
        <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <FiAlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ color: 'var(--danger)', fontSize: '13px', lineHeight: '1.5' }}>
            <strong>Atenção:</strong> Esta ação é <strong>irreversível</strong>. Os dados apagados não poderão ser recuperados. Use com cautela.
          </p>
        </div>
        {cleanupStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px', background: cleanupStatus.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: cleanupStatus.type === 'success' ? 'var(--success)' : 'var(--danger)', border: `1px solid ${cleanupStatus.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            {cleanupStatus.type === 'success' ? <FiCheck size={16} /> : <FiAlertCircle size={16} />}
            {cleanupStatus.message}
          </div>
        )}
        <button className="btn-danger" onClick={handleCleanup} disabled={cleaning} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px' }}>
          <FiTrash2 size={16} />
          {cleaning ? 'Apagando...' : 'Apagar dados com mais de 4 anos'}
        </button>
      </div>
    </>
  );
}
