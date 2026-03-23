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
  const [activeMaq, setActiveMaq] = useState(0);
  const [data, setData] = useState('');
  const [nota, setNota] = useState('N/A');
  const [valor, setValor] = useState('');

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
    const updated = machines.filter((_, i) => i !== index);
    setMachines(updated);
    if (activeMaq >= updated.length) setActiveMaq(updated.length - 1);
  };

  const addRecord = async () => {
    if (!data || !valor) return;
    const m = machines[activeMaq];
    try {
      const res = await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addRecord', machineId: m.id, month: monthKey, data, nota, valor: parseFloat(valor) }) });
      const newRecord = await res.json();
      setRecords({ ...records, [m.id]: [...(records[m.id] || []), newRecord] });
      setData(''); setNota('N/A'); setValor('');
    } catch {}
  };

  const deleteRecord = async (recordId) => {
    const m = machines[activeMaq];
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteRecord', id: recordId }) });
    setRecords({ ...records, [m.id]: (records[m.id] || []).filter(r => r.id !== recordId) });
  };

  const updateObs = async (texto) => {
    const m = machines[activeMaq];
    setObservations({ ...observations, [m.id]: texto });
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateObs', machineId: m.id, month: monthKey, texto }) });
  };

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  const currentMaq = machines[activeMaq];
  const currentRecords = currentMaq ? (records[currentMaq.id] || []) : [];
  const currentTotal = currentRecords.reduce((sum, r) => sum + r.valor, 0);
  const currentObs = currentMaq ? (observations[currentMaq.id] || '') : '';
  const maximo = currentMaq?.maximo || 0;
  const percent = maximo > 0 ? Math.min((currentTotal / maximo) * 100, 100) : 0;
  const isNearLimit = maximo > 0 && percent >= 80;
  const isOverLimit = maximo > 0 && currentTotal >= maximo;

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><h1 className="page-title">Maquinetas</h1><p className="page-subtitle">Controle de recebimentos das maquinetas</p></div><div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Link href="/maquinetas/relatorios" className="report-link"><FiBarChart2 size={16} /> Relat\u00f3rios</Link><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div></div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {machines.map((m, i) => (
              <button key={m.id} className={`tab ${activeMaq === i ? 'tab-active' : ''}`} onClick={() => setActiveMaq(i)}>{m.nome}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary btn-small" onClick={addMachine}><FiPlus size={14} /> Adicionar</button>
            {machines.length > 1 && <button className="btn-secondary btn-small" onClick={() => removeMachine(activeMaq)} style={{ color: 'var(--danger)' }}><FiMinus size={14} /> Remover</button>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Nome da Maquineta</label>
            <input type="text" className="form-input" value={currentMaq?.nome || ''} onChange={(e) => updateMachineName(activeMaq, e.target.value)} />
          </div>
          <div className="form-group" style={{ minWidth: '180px' }}>
            <label className="form-label">Limite M\u00e1ximo Mensal (R$)</label>
            <input type="number" className="form-input" value={maximo || ''} onChange={(e) => updateMaximo(activeMaq, e.target.value)} placeholder="0,00" step="0.01" />
          </div>
        </div>

        {maximo > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>{formatCurrency(currentTotal)} / {formatCurrency(maximo)}</span>
              <span>{percent.toFixed(0)}%</span>
            </div>
            <div className="progress-bar"><div className={`progress-fill ${isOverLimit ? 'danger' : isNearLimit ? 'warning' : ''}`} style={{ width: `${percent}%` }} /></div>
            {isNearLimit && !isOverLimit && (<div className="limit-alert warning"><FiAlertTriangle size={14} /> Aten\u00e7\u00e3o: a maquineta est\u00e1 se aproximando do limite m\u00e1ximo!</div>)}
            {isOverLimit && (<div className="limit-alert danger"><FiAlertTriangle size={14} /> A maquineta atingiu ou ultrapassou o limite m\u00e1ximo!</div>)}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Registrar Recebimento</h2>
        <div className="inline-form">
          <div className="form-group"><label className="form-label">Data</label><input type="date" className="form-input" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Nota</label><select className="form-input" value={nota} onChange={(e) => setNota(e.target.value)}><option>N/A</option><option>D\u00e9bito</option><option>Cr\u00e9dito</option><option>PIX</option></select></div>
          <div className="form-group" style={{ minWidth: '140px' }}><label className="form-label">Valor (R$)</label><input type="number" className="form-input" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" step="0.01" /></div>
          <button className="btn-primary" onClick={addRecord}>Adicionar</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Recebimentos do M\u00eas</h2>
        {currentRecords.length === 0 ? (<div className="no-data">Nenhum recebimento neste m\u00eas</div>) : (
          <div className="table-wrapper"><table><thead><tr><th>Data</th><th>Nota</th><th>Valor</th><th></th></tr></thead>
          <tbody>{currentRecords.map((r) => (<tr key={r.id}><td>{r.data}</td><td>{r.nota}</td><td>{formatCurrency(r.valor)}</td><td><button className="delete-btn" onClick={() => deleteRecord(r.id)}><FiTrash2 /></button></td></tr>))}</tbody></table></div>
        )}
        <div className="total-bar"><span className="total-label">Total recebido em {currentMaq?.nome || 'maquineta'}</span><span className="total-value">{formatCurrency(currentTotal)}</span></div>
      </div>

      <div className="card">
        <h2 className="card-title">Observa\u00e7\u00f5es</h2>
        <textarea className="form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={currentObs} onChange={(e) => updateObs(e.target.value)} placeholder="Adicione observa\u00e7\u00f5es sobre esta maquineta..." />
      </div>
    </>
  );
}
