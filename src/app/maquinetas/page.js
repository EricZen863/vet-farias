'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import { saveData, loadData, getMonthKey } from '../../lib/storage';
import Link from 'next/link';
import { FiTrash2, FiBarChart2, FiPlus, FiAlertTriangle } from 'react-icons/fi';

export default function MaquinetasPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [machines, setMachines] = useState([]);
  const [allRecords, setAllRecords] = useState({});
  const [observations, setObservations] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return;
    const savedMachines = loadData('maquinetas', 'config', [
      { id: 1, nome: 'Maquineta 1', maximo: 0 },
      { id: 2, nome: 'Maquineta 2', maximo: 0 },
      { id: 3, nome: 'Maquineta 3', maximo: 0 },
    ]);
    setMachines(savedMachines);
    const recs = {}; const obs = {};
    savedMachines.forEach(m => {
      recs[m.id] = loadData('maquinetas', `records_${m.id}_${monthKey}`, []);
      obs[m.id] = loadData('maquinetas', `obs_${m.id}_${monthKey}`, '');
    });
    setAllRecords(recs); setObservations(obs);
  }, [isAuthenticated, monthKey]);

  const updateMachineName = (id, nome) => {
    const updated = machines.map(m => m.id === id ? { ...m, nome } : m);
    setMachines(updated); saveData('maquinetas', 'config', updated);
  };

  const updateMaximo = (id, maximo) => {
    const updated = machines.map(m => m.id === id ? { ...m, maximo: parseFloat(maximo) || 0 } : m);
    setMachines(updated); saveData('maquinetas', 'config', updated);
  };

  const addMachine = () => {
    const newId = Math.max(...machines.map(m => m.id), 0) + 1;
    const updated = [...machines, { id: newId, nome: `Maquineta ${newId}`, maximo: 0 }];
    setMachines(updated); saveData('maquinetas', 'config', updated);
    setAllRecords({ ...allRecords, [newId]: [] }); setObservations({ ...observations, [newId]: '' });
  };

  const removeMachine = (id) => {
    const updated = machines.filter(m => m.id !== id);
    setMachines(updated); saveData('maquinetas', 'config', updated);
    const newRecs = { ...allRecords }; delete newRecs[id]; setAllRecords(newRecs);
    const newObs = { ...observations }; delete newObs[id]; setObservations(newObs);
  };

  const addRecord = (machineId, data, nota, valor) => {
    if (!data || !valor) return;
    const newRecord = { id: Date.now(), data, nota, valor: parseFloat(valor) };
    const records = [...(allRecords[machineId] || []), newRecord];
    setAllRecords({ ...allRecords, [machineId]: records });
    saveData('maquinetas', `records_${machineId}_${monthKey}`, records);
  };

  const deleteRecord = (machineId, recordId) => {
    const records = (allRecords[machineId] || []).filter(r => r.id !== recordId);
    setAllRecords({ ...allRecords, [machineId]: records });
    saveData('maquinetas', `records_${machineId}_${monthKey}`, records);
  };

  const updateObservation = (machineId, text) => {
    setObservations({ ...observations, [machineId]: text });
    saveData('maquinetas', `obs_${machineId}_${monthKey}`, text);
  };

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const grandTotal = machines.reduce((sum, m) => sum + (allRecords[m.id] || []).reduce((s, r) => s + r.valor, 0), 0);

  if (loading || !isAuthenticated) return null;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Maquinetas</h1>
            <p className="page-subtitle">Controle de recebimentos por maquineta</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/maquinetas/relatorios" className="report-link"><FiBarChart2 size={16} /> Relatórios</Link>
            <MonthSelector value={monthKey} onChange={setMonthKey} />
          </div>
        </div>
      </div>

      <div className="maquineta-grid">
        {machines.map((machine) => {
          const records = allRecords[machine.id] || [];
          const total = records.reduce((s, r) => s + r.valor, 0);
          const pct = machine.maximo > 0 ? (total / machine.maximo) * 100 : 0;
          const alertClass = pct >= 90 ? 'danger' : pct >= 80 ? 'warning' : 'safe';

          return (
            <div key={machine.id} className="maquineta-card">
              <div className="maquineta-header">
                <div className="editable-title">
                  <input type="text" value={machine.nome} onChange={(e) => updateMachineName(machine.id, e.target.value)} />
                </div>
                <button className="btn-danger btn-small" onClick={() => removeMachine(machine.id)}>Remover</button>
              </div>
              <div className="maquineta-body">
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Máximo (R$)</label>
                  <input type="number" className="form-input" value={machine.maximo || ''} onChange={(e) => updateMaximo(machine.id, e.target.value)} placeholder="Limite máximo" step="0.01" />
                </div>
                {machine.maximo > 0 && (
                  <div className="progress-container" style={{ marginBottom: '16px' }}>
                    <div className="progress-bar-bg"><div className={`progress-bar-fill ${alertClass}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                    <div className="progress-info"><span>{pct.toFixed(1)}%</span><span>{formatCurrency(total)} / {formatCurrency(machine.maximo)}</span></div>
                    {pct >= 80 && (<div className={`alert-badge alert-${alertClass}`} style={{ marginTop: '8px' }}><FiAlertTriangle size={14} />{pct >= 90 ? 'ATENÇÃO: Limite quase atingido!' : 'Aviso: Aproximando do limite'}</div>)}
                  </div>
                )}
                <MachineRecordForm machineId={machine.id} onAdd={addRecord} />
                {records.length > 0 && (
                  <div className="table-wrapper" style={{ marginTop: '12px' }}>
                    <table><thead><tr><th>Data</th><th>Nota</th><th>Valor</th><th></th></tr></thead>
                    <tbody>{records.map((r) => (<tr key={r.id}><td>{r.data}</td><td><span className={`note-status note-${r.nota === 'OK' ? 'ok' : r.nota === 'Falta' ? 'falta' : 'na'}`}>{r.nota}</span></td><td>{formatCurrency(r.valor)}</td><td><button className="delete-btn" onClick={() => deleteRecord(machine.id, r.id)}><FiTrash2 /></button></td></tr>))}</tbody></table>
                  </div>
                )}
              </div>
              <div className="maquineta-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Total do Mês</span>
                  <span style={{ fontWeight: '700', fontSize: '20px', color: 'var(--primary-light)' }}>{formatCurrency(total)}</span>
                </div>
                <label className="form-label">Observação</label>
                <textarea className="obs-field" value={observations[machine.id] || ''} onChange={(e) => updateObservation(machine.id, e.target.value)} placeholder="Deixe uma observação..." />
              </div>
            </div>
          );
        })}
      </div>

      <button className="add-btn" style={{ marginTop: '24px' }} onClick={addMachine}><FiPlus size={18} /> Adicionar Nova Maquineta</button>

      <div className="total-bar" style={{ marginTop: '24px' }}>
        <span className="total-label">Total Geral - Todas as Maquinetas</span>
        <span className="total-value">{formatCurrency(grandTotal)}</span>
      </div>
    </>
  );
}

function MachineRecordForm({ machineId, onAdd }) {
  const [data, setData] = useState('');
  const [nota, setNota] = useState('N/A');
  const [valor, setValor] = useState('');
  const handleAdd = () => {
    onAdd(machineId, data, nota, valor);
    setData(''); setNota('N/A'); setValor('');
  };
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'end', flexWrap: 'wrap' }}>
      <input type="date" className="form-input" style={{ flex: '1', minWidth: '120px' }} value={data} onChange={(e) => setData(e.target.value)} />
      <select className="form-input" style={{ width: '80px' }} value={nota} onChange={(e) => setNota(e.target.value)}>
        <option>N/A</option><option>OK</option><option>Falta</option>
      </select>
      <input type="number" className="form-input" style={{ width: '100px' }} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor" step="0.01" />
      <button className="btn-primary btn-small" onClick={handleAdd} style={{ padding: '12px', borderRadius: '8px' }}><FiPlus size={16} /></button>
    </div>
  );
}
