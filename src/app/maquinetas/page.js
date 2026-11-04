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

  const getForm = (id) => forms[id] || { data: '', nota: 'N/A', valor: '', valor_produto: '' };
  const setForm = (id, field, value) => {
    setForms(prev => ({ ...prev, [id]: { ...getForm(id), [field]: value } }));
  };

  const updateMachineName = async (index, nome) => {
    const m = machines[index];
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateName', id: m.id, nome }) });
    const updated = [...machines]; updated[index] = { ...m, nome }; setMachines(updated);
  };

  const updateMaximo = async (index, value) => {
    const m = machines[index];
    const maximo = parseFloat(value) || 0;
    const updated = [...machines];
    updated[index] = { ...m, maximo };
    setMachines(updated);
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateMaximo', id: m.id, maximo }) });
  };

  const addMachine = async () => {
    try {
      const res = await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addMachine', nome: `Maquineta ${machines.length + 1}` }) });
      const newMachine = await res.json();
      setMachines([...machines, newMachine]);
      setRecords(prev => ({ ...prev, [newMachine.id]: [] }));
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
      const res = await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addRecord', machineId, month: monthKey, data: form.data, nota: form.nota, valor: parseFloat(form.valor), valor_produto: parseFloat(form.valor_produto) || 0 }) });
      const newRecord = await res.json();
      setRecords(prev => ({ ...prev, [machineId]: [...(prev[machineId] || []), newRecord] }));
      setForms(prev => ({ ...prev, [machineId]: { data: '', nota: 'N/A', valor: '', valor_produto: '' } }));
    } catch {}
  };

  const deleteRecord = async (machineId, recordId) => {
    await fetch('/api/maquinetas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteRecord', id: recordId }) });
    setRecords(prev => ({ ...prev, [machineId]: (prev[machineId] || []).filter(r => r.id !== recordId) }));
  };

  // Atualização direta de campos
  const handleFieldChange = (machineId, recordId, field, value) => {
    setRecords(prev => ({
      ...prev,
      [machineId]: (prev[machineId] || []).map(r => r.id === recordId ? { ...r, [field]: value } : r)
    }));
  };

  const handleServicoChange = (machineId, recordId, servicoVal) => {
    setRecords(prev => ({
      ...prev,
      [machineId]: (prev[machineId] || []).map(r => {
        if (r.id !== recordId) return r;
        const prod = parseFloat(r.valor_produto) || 0;
        const s = servicoVal === '' ? '' : (parseFloat(servicoVal) || 0);
        const newTotal = s === '' ? prod : parseFloat((prod + s).toFixed(2));
        return { ...r, valor: newTotal, _servicoInput: servicoVal };
      })
    }));
  };

  const updateData = async (machineId, recordId, data) => {
    setRecords(prev => ({
      ...prev,
      [machineId]: (prev[machineId] || []).map(r => r.id === recordId ? { ...r, data } : r)
    }));
    await fetch('/api/maquinetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateData', id: recordId, data })
    });
  };

  const updateNota = async (machineId, recordId, nota) => {
    setRecords(prev => ({
      ...prev,
      [machineId]: (prev[machineId] || []).map(r => r.id === recordId ? { ...r, nota } : r)
    }));
    await fetch('/api/maquinetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateNota', id: recordId, nota })
    });
  };

  const saveValorTotal = async (machineId, recordId, rawVal) => {
    const v = parseFloat(rawVal) || 0;
    setRecords(prev => ({
      ...prev,
      [machineId]: (prev[machineId] || []).map(r => r.id === recordId ? { ...r, valor: v, _servicoInput: undefined } : r)
    }));
    await fetch('/api/maquinetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateValor', id: recordId, valor: v })
    });
  };

  const saveValorProduto = async (machineId, recordId, rawVal) => {
    const vp = parseFloat(rawVal) || 0;
    setRecords(prev => ({
      ...prev,
      [machineId]: (prev[machineId] || []).map(r => r.id === recordId ? { ...r, valor_produto: vp } : r)
    }));
    await fetch('/api/maquinetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateValorProduto', id: recordId, valor_produto: vp })
    });
  };

  const saveServico = async (machineId, recordId, rawServico) => {
    const s = parseFloat(rawServico) || 0;
    const currentRec = (records[machineId] || []).find(r => r.id === recordId);
    const prod = currentRec ? (parseFloat(currentRec.valor_produto) || 0) : 0;
    const newTotal = parseFloat((prod + s).toFixed(2));
    setRecords(prev => ({
      ...prev,
      [machineId]: (prev[machineId] || []).map(r => r.id === recordId ? { ...r, valor: newTotal, _servicoInput: undefined } : r)
    }));
    await fetch('/api/maquinetas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateValor', id: recordId, valor: newTotal })
    });
  };

  const updateObs = async (machineId, texto) => {
    setObservations(prev => ({ ...prev, [machineId]: texto }));
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
          const total = mRecords.reduce((sum, r) => sum + (parseFloat(r.valor) || 0), 0);
          const totalProdutos = mRecords.reduce((sum, r) => sum + (parseFloat(r.valor_produto) || 0), 0);
          const totalServicos = Math.max(0, total - totalProdutos);
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
                    style={{ fontWeight: 600, fontSize: '16px', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)', borderRadius: 0, padding: '4px 0', width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Limite Máximo (R$)</div>
                    <input
                      type="number" className="form-input" value={maximo > 0 ? maximo : ''}
                      onChange={(e) => updateMaximo(index, e.target.value)}
                      placeholder="0,00" step="0.01"
                      style={{ width: '130px', textAlign: 'right', padding: '6px 10px', fontSize: '13px' }}
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
                  <select className="form-input" value={form.nota} onChange={(e) => setForm(m.id, 'nota', e.target.value)} style={{ width: '80px', padding: '8px 10px', fontSize: '13px' }}>
                    <option>N/A</option>
                    <option>OK</option>
                    <option>Falta</option>
                  </select>
                  <input type="number" className="form-input" value={form.valor} onChange={(e) => setForm(m.id, 'valor', e.target.value)} placeholder="R$" step="0.01" style={{ width: '90px', padding: '8px 10px', fontSize: '13px' }} title="Valor total do dia" />
                  <input type="number" className="form-input" value={form.valor_produto} onChange={(e) => setForm(m.id, 'valor_produto', e.target.value)} placeholder="Prod. R$" step="0.01" style={{ width: '90px', padding: '8px 10px', fontSize: '13px' }} title="Valor de produtos" />
                  <button className="btn-primary" onClick={() => addRecord(m.id)} style={{ padding: '8px 16px', fontSize: '13px' }}>+</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    💡 Dica: Todas as colunas abaixo podem ser editadas diretamente na tabela.
                  </span>
                </div>

                {mRecords.length === 0 ? (
                  <div className="no-data" style={{ padding: '20px', fontSize: '13px' }}>Nenhum recebimento</div>
                ) : (
                  <div className="table-wrapper" style={{ marginTop: 0, minHeight: '80px', maxHeight: 'none', height: '220px', overflowY: 'auto', resize: 'vertical', paddingBottom: '8px', borderBottom: '3px solid var(--border)', cursor: 'ns-resize' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Nota</th>
                          <th>Total Dia</th>
                          <th>Prod.</th>
                          <th>Serviço</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {mRecords.map((r) => {
                          const totalVal = parseFloat(r.valor) || 0;
                          const prodVal = parseFloat(r.valor_produto) || 0;
                          const calculatedServico = Math.max(0, parseFloat((totalVal - prodVal).toFixed(2)));
                          const servicoDisplay = r._servicoInput !== undefined ? r._servicoInput : calculatedServico;

                          return (
                            <tr key={r.id}>
                              {/* DATA */}
                              <td style={{ fontSize: '12px', padding: '4px' }}>
                                <input
                                  type="date"
                                  value={r.data || ''}
                                  onChange={(e) => updateData(m.id, r.id, e.target.value)}
                                  style={{
                                    background: 'var(--bg-input)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '11px',
                                    width: '115px',
                                    fontFamily: 'inherit',
                                    cursor: 'pointer'
                                  }}
                                  title="Clique para editar a data"
                                />
                              </td>

                              {/* NOTA */}
                              <td style={{ fontSize: '12px', padding: '4px' }}>
                                <select
                                  value={r.nota || 'N/A'}
                                  onChange={(e) => updateNota(m.id, r.id, e.target.value)}
                                  style={{
                                    background: 'var(--bg-input)',
                                    color: r.nota === 'OK' ? '#4ade80' : r.nota === 'Falta' ? '#f87171' : 'var(--text-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                  }}
                                  title="Editar status de nota fiscal"
                                >
                                  <option value="N/A" style={{ color: 'var(--text)' }}>N/A</option>
                                  <option value="OK" style={{ color: '#4ade80' }}>OK</option>
                                  <option value="Falta" style={{ color: '#f87171' }}>Falta</option>
                                </select>
                              </td>

                              {/* TOTAL DIA */}
                              <td style={{ fontSize: '12px', padding: '4px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={r.valor !== undefined ? r.valor : ''}
                                  onChange={(e) => handleFieldChange(m.id, r.id, 'valor', e.target.value)}
                                  onBlur={(e) => saveValorTotal(m.id, r.id, e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                  style={{
                                    background: 'var(--bg-input)',
                                    color: 'var(--primary-light)',
                                    fontWeight: 600,
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '12px',
                                    width: '80px',
                                    fontFamily: 'inherit'
                                  }}
                                  title="Editar Total do Dia (ajusta Serviço automaticamente)"
                                />
                              </td>

                              {/* PROD. */}
                              <td style={{ fontSize: '12px', padding: '4px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={r.valor_produto !== undefined ? r.valor_produto : ''}
                                  onChange={(e) => handleFieldChange(m.id, r.id, 'valor_produto', e.target.value)}
                                  onBlur={(e) => saveValorProduto(m.id, r.id, e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                  style={{
                                    background: 'var(--bg-input)',
                                    color: '#f59e0b',
                                    fontWeight: 600,
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '12px',
                                    width: '80px',
                                    fontFamily: 'inherit'
                                  }}
                                  title="Editar valor de Produtos (ajusta Serviço automaticamente)"
                                />
                              </td>

                              {/* SERVIÇO */}
                              <td style={{ fontSize: '12px', padding: '4px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={servicoDisplay}
                                  onChange={(e) => handleServicoChange(m.id, r.id, e.target.value)}
                                  onBlur={(e) => saveServico(m.id, r.id, e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                  style={{
                                    background: 'var(--bg-input)',
                                    color: '#4ade80',
                                    fontWeight: 600,
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '12px',
                                    width: '80px',
                                    fontFamily: 'inherit'
                                  }}
                                  title="Editar valor de Serviço (ajusta o Total Dia automaticamente)"
                                />
                              </td>

                              {/* EXCLUIR */}
                              <td>
                                <button className="delete-btn" onClick={() => deleteRecord(m.id, r.id)} title="Excluir recebimento">
                                  <FiTrash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</span>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-light)' }}>{formatCurrency(total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Produtos</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(totalProdutos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Serviços</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#4ade80' }}>{formatCurrency(totalServicos)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
