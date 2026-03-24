'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import { getMonthKey } from '../../lib/storage';
import Link from 'next/link';
import { FiTrash2, FiBarChart2, FiPlus, FiMinus, FiAlertTriangle } from 'react-icons/fi';

export default function MaquinetasPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [machines, setMachines] = useState([]);
  const [records, setRecords] = useState({});
  const [observations, setObservations] = useState({});
  const [forms, setForms] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/maquinetas?month=${monthKey}`)
      .then(r => r.json())
      .then(result => {
        if (result.machines?.length > 0) {
          setMachines(result.machines);
          setRecords(result.records || {});
          setObservations(result.observations || {});
        }
      }).catch(() => {});
  }, [isAuthenticated, monthKey]);

  const getForm = (id) => forms[id] || { data: '', nota: 'N/A', valor: '' };
  const setForm = (id, field, value) => setForms({ ...forms, [id]: { ...getForm(id), [field]: value } });

  const updateMachineName = async (index, nome) => {
    const m = machines[index];
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateName', id: m.id, nome }) });
    const updated = [...machines]; updated[index] = { ...m, nome }; setMachines(updated);
  };

  const updateMaximo = async (index, maximo) => {
    const m = machines[index];
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateMaximo', id: m.id, maximo: parseFloat(maximo) || 0 }) });
    const updated = [...machines]; updated[index] = { ...m, maximo: parseFloat(maximo) || 0 }; setMachines(updated);
  };

  const addMachine = async () => {
    try {
      const res = await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addMachine', nome: `Maquineta ${machines.length + 1}` }) });
      const newMachine = await res.json();
      setMachines([...machines, newMachine]);
      setRecords({ ...records, [newMachine.id]: [] });
    } catch {}
  };

  const removeMachine = async (index) => {
    const m = machines[index];
    if (machines.length <= 1) return;
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'removeMachine', id: m.id }) });
    setMachines(machines.filter((_, i) => i !== index));
  };

  const addRecord = async (machineId) => {
    const form = getForm(machineId);
    if (!form.data || !form.valor) return;
    try {
      const res = await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addRecord', machineId, month: monthKey, data: form.data, nota: form.nota, valor: parseFloat(form.valor) }) });
      const newRecord = await res.json();
      setRecords({ ...records, [machineId]: [...(records[machineId] || []), newRecord] });
      setForms({ ...forms, [machineId]: { data: '', nota: 'N/A', valor: '' } });
    } catch {}
  };

  const deleteRecord = async (machineId, recordId) => {
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteRecord', id: recordId }) });
    setRecords({ ...records, [machineId]: (records[machineId] || []).filter(r => r.id !== recordId) });
  };

  const updateObs = async (machineId, texto) => {
    setObservations({ ...observations, [machineId]: texto });
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateObs', machineId, month: monthKey, texto }) });
  };

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Maquinetas</h1>
            <p className="page-subtitle">Controle de recebimentos das maquinetas</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-secondary btn-small" onClick={addMachine}><FiPlus size={14} /> Adicionar Maquineta</button>
            <Link href="/maquinetas/relatorios" className="report-link"><FiBarChart2 size={16} /> Relatórios</Link>
            <MonthSelector value={monthKey} onChange={setMonthKey} />
          </div>
        </div>
      </div>

      <div className="maquineta-grid">
        {machines.map((m, index) => {
          const mRecords = records[m.id] || [];
          const total = mRecords.reduce((sum, r) => sum + r.valor, 0);
          const maximo = m.maximo || 0;
          const percent = maximo > 0 ? Math.min((total / maximo) * 100, 100) : 0;
          const isNearLimit = maximo > 0 && percent >= 80;
          const isOverLimit = maximo > 0 && total >= maximo;
          const form = getForm(m.id);
          const obs = observations[m.id] || '';

          return (
            <div className="maquineta-card" key={m.id}>
              <div className="maquineta-header">
                <div style={{ flex: 1 }}>
                  <input
                    type="text" className="form-input" value={m.nome}
                    onChange={(e) => updateMachineName(index, e.target.value)}
                    style={{ fontWeight: 600, fontSize: '16px', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)', borderRadius: 0, padding: '4px 0' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Limite</div>
                    <input
                      type="number" className="form-input" value={maximo || ''}
                      onChange={(e) => updateMaximo(index, e.target.value)}
                      placeholder="0,00" step="0.01"
                      style={{ width: '120px', textAlign: 'right', padding: '4px 8px', fontSize: '13px' }}
                    />
                  </div>
                  {machines.length > 1 && (
                    <button className="delete-btn" onClick={() => removeMachine(index)} title="Remover maquineta">
                      <FiMinus size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="maquineta-body">
                {maximo > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>{formatCurrency(total)} / {formatCurrency(maximo)}</span>
                      <span>{percent.toFixed(0)}%</span>
                    </div>
                    <div className="progress-bar"><div className={`progress-fill ${isOverLimit ? 'danger' : isNearLimit ? 'warning' : ''}`} style={{ width: `${percent}%` }} /></div>
                    {isNearLimit && !isOverLimit && (<div className="limit-alert warning"><FiAlertTriangle size={14} /> Aproximando do limite!</div>)}
                    {isOverLimit && (<div className="limit-alert danger"><FiAlertTriangle size={14} /> Limite atingido!</div>)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input type="date" className="form-input" value={form.data} onChange={(e) => setForm(m.id, 'data', e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px 10px', fontSize: '13px' }} />
                  <select className="form-input" value={form.nota} onChange={(e) => setForm(m.id, 'nota', e.target.value)} style={{ width: '100px', padding: '8px 10px', fontSize: '13px' }}>
                    <option>N/A</option><option>Débito</option><option>Crédito</option><option>PIX</option>
                  </select>
                  <input type="number" className="form-input" value={form.valor} onChange={(e) => setForm(m.id, 'valor', e.target.value)} placeholder="R$" step="0.01" style={{ width: '100px', padding: '8px 10px', fontSize: '13px' }} />
                  <button className="btn-primary" onClick={() => addRecord(m.id)} style={{ padding: '8px 16px', fontSize: '13px' }}>+</button>
                </div>

                {mRecords.length === 0 ? (
                  <div className="no-data" style={{ padding: '20px', fontSize: '13px' }}>Nenhum recebimento</div>
                ) : (
                  <div className="table-wrapper" style={{ marginTop: 0, maxHeight: '200px', overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>Data</th><th>Nota</th><th>Valor</th><th></th></tr></thead>
                      <tbody>{mRecords.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontSize: '12px' }}>{r.data}</td>
                          <td style={{ fontSize: '12px' }}>{r.nota}</td>
                          <td style={{ fontSize: '12px' }}>{formatCurrency(r.valor)}</td>
                          <td><button className="delete-btn" onClick={() => deleteRecord(m.id, r.id)}><FiTrash2 size={12} /></button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <textarea
                    className="obs-field" value={obs}
                    onChange={(e) => updateObs(m.id, e.target.value)}
                    placeholder="Observações..."
                    style={{ minHeight: '50px' }}
                  />
                </div>
              </div>

              <div className="maquineta-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-light)' }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
