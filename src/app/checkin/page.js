'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { FiClock, FiCheckCircle } from 'react-icons/fi';

export default function CheckinPage() {
  const { user, userType } = useAuth();
  const [registro, setRegistro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
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
      const hoje = new Date().toISOString().split('T')[0];
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
    try {
      setMessage('Registrando...');
      const hoje = new Date().toISOString().split('T')[0];
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
                  <option value="folga">Dia de Folga</option>
                  <option value="feriado">Feriado</option>
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
              time={registro?.entrada} 
              onClick={() => handlePunch('entrada')} 
              disabled={!!registro?.entrada} 
            />
            <PunchButton 
              label="2. Saída para Almoço" 
              time={registro?.saida_almoco} 
              onClick={() => handlePunch('saida_almoco')} 
              disabled={!registro?.entrada || !!registro?.saida_almoco} 
            />
            <PunchButton 
              label="3. Volta do Almoço" 
              time={registro?.volta_almoco} 
              onClick={() => handlePunch('volta_almoco')} 
              disabled={!registro?.saida_almoco || !!registro?.volta_almoco} 
            />
            <PunchButton 
              label="4. Saída" 
              time={registro?.saida} 
              onClick={() => handlePunch('saida')} 
              disabled={!registro?.entrada || !!registro?.saida} 
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

function PunchButton({ label, time, onClick, disabled }) {
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
        opacity: disabled && !isDone ? 0.5 : 1,
        backgroundColor: isDone ? 'var(--bg-secondary)' : 'var(--primary)',
        color: isDone ? 'var(--text-primary)' : '#fff',
        border: isDone ? '1px solid var(--border)' : 'none'
      }}
    >
      <span>{label}</span>
      {isDone ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {time.substring(0, 5)} <FiCheckCircle color="green" />
        </span>
      ) : (
        <span>Registrar</span>
      )}
    </button>
  );
}
