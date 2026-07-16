'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { FiClock, FiCheckCircle } from 'react-icons/fi';

export default function CheckinPage() {
  const { user, userType } = useAuth();
  const [registro, setRegistro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeCampo, setActiveCampo] = useState(null);
  const [time, setTime] = useState(new Date());

  const [tipoDia, setTipoDia] = useState('normal');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (userType === 'funcionario' && user) {
      loadTodayRecord();
    }
  }, [user, userType]);

  const loadTodayRecord = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const hoje = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const res = await fetch(`/api/ponto?funcionarioId=${user.id}&data=${hoje}`);
      const data = await res.json();
      if (data && !data.error) {
        setRegistro(data);
      } else {
        setRegistro(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async (campo) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      setActiveCampo(campo);
      setMessage('');
      const now = new Date();
      const hoje = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const agora = new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

      // If no record exists, initiate the day first
      if (!registro) {
        await fetch('/api/ponto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'iniciarDia', funcionarioId: user.id, data: hoje, tipoDia: tipoDia })
        });
      }

      const res = await fetch('/api/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'registrar', funcionarioId: user.id, data: hoje, campo, valor: agora })
      });
      
      const updated = await res.json();
      if (!updated.error) {
        setRegistro(updated);
        setMessage('Ponto registrado com sucesso!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Erro ao registrar ponto: ' + updated.error);
      }
    } catch (err) {
      setMessage('Erro de conexão');
    } finally {
      setSubmitting(false);
      setActiveCampo(null);
    }
  };

  if (userType !== 'funcionario') {
    return (
      <div className="page-container">
        <h1>Acesso Negado</h1>
        <p>Esta página é exclusiva para funcionários.</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '40px' }}>
      <div className="card" style={{ padding: '40px 20px', borderRadius: '16px' }}>
        <FiClock size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Registro de Ponto</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '32px' }}>
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          <br/>
          <strong style={{ fontSize: '36px', color: 'var(--text-primary)', display: 'block', marginTop: '8px' }}>
            {time.toLocaleTimeString('pt-BR', { hour12: false })}
          </strong>
        </p>

        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!registro && (
              <div className="form-group" style={{ textAlign: 'left', marginBottom: '8px' }}>
                <label className="form-label">Tipo de Dia</label>
                <select 
                  className="form-input" 
                  value={tipoDia} 
                  onChange={(e) => setTipoDia(e.target.value)}
                >
                  <option value="normal">Dia Normal</option>
                  <option value="folga">Folga Trabalhada</option>
                  <option value="feriado">Feriado Trabalhado</option>
                </select>
              </div>
            )}
            {registro && (
              <div style={{ textAlign: 'left', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Tipo de Dia: <strong style={{color: 'var(--text)', textTransform: 'capitalize'}}>{registro.tipo_dia || 'Normal'}</strong>
              </div>
            )}

            <PunchButton 
              label="1. Entrada" 
              campo="entrada"
              time={registro?.entrada} 
              onClick={() => handlePunch('entrada')} 
              disabled={submitting || !!registro?.entrada} 
              isSubmitting={submitting && activeCampo === 'entrada'}
            />
            <PunchButton 
              label="2. Saída para Almoço" 
              campo="saida_almoco"
              time={registro?.saida_almoco} 
              onClick={() => handlePunch('saida_almoco')} 
              disabled={submitting || !registro?.entrada || !!registro?.saida_almoco} 
              isSubmitting={submitting && activeCampo === 'saida_almoco'}
            />
            <PunchButton 
              label="3. Volta do Almoço" 
              campo="volta_almoco"
              time={registro?.volta_almoco} 
              onClick={() => handlePunch('volta_almoco')} 
              disabled={submitting || !registro?.saida_almoco || !!registro?.volta_almoco} 
              isSubmitting={submitting && activeCampo === 'volta_almoco'}
            />
            <PunchButton 
              label="4. Saída" 
              campo="saida"
              time={registro?.saida} 
              onClick={() => handlePunch('saida')} 
              disabled={submitting || !registro?.entrada || !!registro?.saida} 
              isSubmitting={submitting && activeCampo === 'saida'}
            />
          </div>
        )}

        {message && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: message.includes('Erro') ? '#fee2e2' : '#dcfce7', color: message.includes('Erro') ? '#991b1b' : '#166534', borderRadius: '8px' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function PunchButton({ label, time, onClick, disabled, isSubmitting }) {
  const isDone = !!time;
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn-primary`}
      style={{ 
        padding: '16px', 
        fontSize: '18px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        opacity: disabled && !isDone && !isSubmitting ? 0.5 : 1,
        backgroundColor: isSubmitting ? '#f59e0b' : isDone ? 'var(--bg-secondary)' : 'var(--primary)',
        color: isSubmitting ? '#fff' : isDone ? 'var(--text-primary)' : '#fff',
        border: isDone ? '1px solid var(--border)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.3s ease'
      }}
    >
      <span>{label}</span>
      {isSubmitting ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'pulse 1.5s infinite' }}>
          ⏳ Registrando...
        </span>
      ) : isDone ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {time.substring(0, 5)} <FiCheckCircle color="green" />
        </span>
      ) : (
        <span>Registrar</span>
      )}
    </button>
  );
}
