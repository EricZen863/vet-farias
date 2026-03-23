'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import { getMonthKey } from '../../lib/storage';
import Link from 'next/link';
import { FiTrash2, FiBarChart2 } from 'react-icons/fi';

export default function VolantesCirurgioesPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [records, setRecords] = useState([]);
  const [nome, setNome] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/records?module=cirurgioes&month=${monthKey}`)
      .then(r => r.json()).then(setRecords).catch(() => {});
  }, [isAuthenticated, monthKey]);

  const addRecord = async () => {
    if (!nome || !procedimento || !valor) return;
    try {
      const res = await fetch('/api/records', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'cirurgioes', month: monthKey, nome, procedimento, valor: parseFloat(valor) }),
      });
      const newRecord = await res.json();
      setRecords([...records, newRecord]);
      setNome(''); setProcedimento(''); setValor('');
    } catch {}
  };

  const deleteRecord = async (id) => {
    try {
      await fetch(`/api/records?module=cirurgioes&id=${id}`, { method: 'DELETE' });
      setRecords(records.filter(r => r.id !== id));
    } catch {}
  };

  const total = records.reduce((sum, r) => sum + r.valor, 0);
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><h1 className="page-title">Volantes Cirurgi\u00f5es</h1><p className="page-subtitle">Controle de cirurgi\u00f5es terceirizados</p></div><div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Link href="/volantes-cirurgioes/relatorios" className="report-link"><FiBarChart2 size={16} /> Relat\u00f3rios</Link><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div></div>
      <div className="card" style={{ marginBottom: '24px' }}><h2 className="card-title">Registrar Procedimento</h2><div className="inline-form"><div className="form-group"><label className="form-label">Nome do Cirurgi\u00e3o</label><input type="text" className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cirurgi\u00e3o" /></div><div className="form-group"><label className="form-label">Procedimento</label><input type="text" className="form-input" value={procedimento} onChange={(e) => setProcedimento(e.target.value)} placeholder="Procedimento realizado" /></div><div className="form-group" style={{ minWidth: '140px' }}><label className="form-label">Valor (R$)</label><input type="number" className="form-input" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" step="0.01" /></div><button className="btn-primary" onClick={addRecord}>Adicionar</button></div></div>
      <div className="card"><h2 className="card-title">Registros do M\u00eas</h2>{records.length === 0 ? (<div className="no-data">Nenhum registro neste m\u00eas</div>) : (<div className="table-wrapper"><table><thead><tr><th>Data</th><th>Cirurgi\u00e3o</th><th>Procedimento</th><th>Valor</th><th></th></tr></thead><tbody>{records.map((r) => (<tr key={r.id}><td>{new Date(r.data).toLocaleDateString('pt-BR')}</td><td>{r.nome}</td><td>{r.procedimento}</td><td>{formatCurrency(r.valor)}</td><td><button className="delete-btn" onClick={() => deleteRecord(r.id)}><FiTrash2 /></button></td></tr>))}</tbody></table></div>)}<div className="total-bar"><span className="total-label">Total pago a Volantes Cirurgi\u00f5es no m\u00eas</span><span className="total-value">{formatCurrency(total)}</span></div></div>
    </>
  );
}
