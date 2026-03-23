'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import Autocomplete from '../../components/Autocomplete';
import { saveData, loadData, getMonthKey } from '../../lib/storage';
import Link from 'next/link';
import { FiTrash2, FiBarChart2 } from 'react-icons/fi';
const EXAMES_IMAGEM = ['Ultrassonografia abdominal', 'Raio X', 'Eletrocardiograma', 'Ecocardiograma'];

export default function VolantesImagemPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [records, setRecords] = useState([]);
  const [nome, setNome] = useState('');
  const [exame, setExame] = useState('');
  const [valor, setValor] = useState('');
  useEffect(() => { if (!isAuthenticated) return; setRecords(loadData('imagem', `records_${monthKey}`, [])); }, [isAuthenticated, monthKey]);
  const addRecord = () => {
    if (!nome || !exame || !valor) return;
    const newRecord = { id: Date.now(), data: new Date().toISOString(), nome, exame, valor: parseFloat(valor) };
    const updated = [...records, newRecord]; setRecords(updated); saveData('imagem', `records_${monthKey}`, updated);
    setNome(''); setExame(''); setValor('');
  };
  const deleteRecord = (id) => { const updated = records.filter(r => r.id !== id); setRecords(updated); saveData('imagem', `records_${monthKey}`, updated); };
  const total = records.reduce((sum, r) => sum + r.valor, 0);
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><h1 className="page-title">Volantes Exames de Imagem</h1><p className="page-subtitle">Controle de profissionais de exames de imagem terceirizados</p></div><div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Link href="/volantes-imagem/relatorios" className="report-link"><FiBarChart2 size={16} /> Relatórios</Link><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div></div>
      <div className="card" style={{ marginBottom: '24px' }}><h2 className="card-title">Registrar Exame</h2><div className="inline-form"><div className="form-group"><label className="form-label">Nome do Profissional</label><input type="text" className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do volante" /></div><div className="form-group"><label className="form-label">Exame de Imagem</label><Autocomplete options={EXAMES_IMAGEM} value={exame} onChange={setExame} placeholder="Digite 3 letras para buscar..." /></div><div className="form-group" style={{ minWidth: '140px' }}><label className="form-label">Valor (R$)</label><input type="number" className="form-input" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" step="0.01" /></div><button className="btn-primary" onClick={addRecord}>Adicionar</button></div></div>
      <div className="card"><h2 className="card-title">Registros do Mês</h2>{records.length === 0 ? (<div className="no-data">Nenhum registro neste mês</div>) : (<div className="table-wrapper"><table><thead><tr><th>Data</th><th>Profissional</th><th>Exame</th><th>Valor</th><th></th></tr></thead><tbody>{records.map((r) => (<tr key={r.id}><td>{new Date(r.data).toLocaleDateString('pt-BR')}</td><td>{r.nome}</td><td>{r.exame}</td><td>{formatCurrency(r.valor)}</td><td><button className="delete-btn" onClick={() => deleteRecord(r.id)}><FiTrash2 /></button></td></tr>))}</tbody></table></div>)}<div className="total-bar"><span className="total-label">Total pago a Volantes Exames de Imagem no mês</span><span className="total-value">{formatCurrency(total)}</span></div></div>
    </>
  );
}
