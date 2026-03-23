'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import { saveData, loadData, getMonthKey } from '../../lib/storage';
import Link from 'next/link';
import { FiTrash2, FiBarChart2 } from 'react-icons/fi';

export default function GastosPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [records, setRecords] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  useEffect(() => { if (!isAuthenticated) return; setRecords(loadData('gastos', `records_${monthKey}`, [])); }, [isAuthenticated, monthKey]);
  const addRecord = () => {
    if (!descricao || !valor) return;
    const newRecord = { id: Date.now(), data: new Date().toISOString(), descricao, valor: parseFloat(valor) };
    const updated = [...records, newRecord]; setRecords(updated); saveData('gastos', `records_${monthKey}`, updated);
    setDescricao(''); setValor('');
  };
  const deleteRecord = (id) => { const updated = records.filter(r => r.id !== id); setRecords(updated); saveData('gastos', `records_${monthKey}`, updated); };
  const total = records.reduce((sum, r) => sum + r.valor, 0);
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><h1 className="page-title">Gastos Diversos</h1><p className="page-subtitle">Controle de gastos do dia a dia</p></div><div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Link href="/gastos/relatorios" className="report-link"><FiBarChart2 size={16} /> Relatórios</Link><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div></div>
      <div className="card" style={{ marginBottom: '24px' }}><h2 className="card-title">Registrar Gasto</h2><div className="inline-form"><div className="form-group" style={{ flex: 2 }}><label className="form-label">Descrição do Gasto</label><input type="text" className="form-input" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o gasto" /></div><div className="form-group" style={{ minWidth: '160px' }}><label className="form-label">Valor (R$)</label><input type="number" className="form-input" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" step="0.01" /></div><button className="btn-primary" onClick={addRecord}>Adicionar</button></div></div>
      <div className="card"><h2 className="card-title">Gastos do Mês</h2>{records.length === 0 ? (<div className="no-data">Nenhum gasto registrado neste mês</div>) : (<div className="table-wrapper"><table><thead><tr><th>Data</th><th>Gasto</th><th>Valor</th><th></th></tr></thead><tbody>{records.map((r) => (<tr key={r.id}><td>{new Date(r.data).toLocaleDateString('pt-BR')}</td><td>{r.descricao}</td><td>{formatCurrency(r.valor)}</td><td><button className="delete-btn" onClick={() => deleteRecord(r.id)}><FiTrash2 /></button></td></tr>))}</tbody></table></div>)}<div className="total-bar"><span className="total-label">Total de gastos no mês</span><span className="total-value">{formatCurrency(total)}</span></div></div>
    </>
  );
}
