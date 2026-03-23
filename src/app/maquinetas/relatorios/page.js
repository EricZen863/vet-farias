'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthProvider';
import MonthSelector from '../../../components/MonthSelector';
import { loadData, getMonthKey } from '../../../lib/storage';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);
const chartColors = ['#8c69ac', '#a889c4', '#6b4d8a', '#c4a8e0', '#4ade80', '#fbbf24', '#f87171', '#38bdf8'];

export default function MaquinetasRelatoriosPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [machines, setMachines] = useState([]);
  const [allRecords, setAllRecords] = useState({});

  useEffect(() => {
    if (!isAuthenticated) return;
    const saved = loadData('maquinetas', 'config', [{ id: 1, nome: 'Maquineta 1', maximo: 0 }, { id: 2, nome: 'Maquineta 2', maximo: 0 }, { id: 3, nome: 'Maquineta 3', maximo: 0 }]);
    setMachines(saved);
    const recs = {};
    saved.forEach(m => { recs[m.id] = loadData('maquinetas', `records_${m.id}_${monthKey}`, []); });
    setAllRecords(recs);
  }, [isAuthenticated, monthKey]);

  if (loading || !isAuthenticated) return null;
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const machineTotals = machines.map(m => ({ ...m, total: (allRecords[m.id] || []).reduce((s, r) => s + r.valor, 0) }));
  const grandTotal = machineTotals.reduce((s, m) => s + m.total, 0);
  const totalRecords = machines.reduce((s, m) => s + (allRecords[m.id] || []).length, 0);

  const barData = { labels: machineTotals.map(m => m.nome), datasets: [{ label: 'Total (R$)', data: machineTotals.map(m => m.total), backgroundColor: chartColors.slice(0, machineTotals.length), borderRadius: 6 }] };

  let noteOk = 0, noteFalta = 0, noteNa = 0;
  machines.forEach(m => { (allRecords[m.id] || []).forEach(r => { if (r.nota === 'OK') noteOk++; else if (r.nota === 'Falta') noteFalta++; else noteNa++; }); });
  const doughnutData = { labels: ['OK', 'Falta', 'N/A'], datasets: [{ data: [noteOk, noteFalta, noteNa], backgroundColor: ['#4ade80', '#f87171', '#6b7280'], borderWidth: 0 }] };

  const maxCompData = { labels: machineTotals.map(m => m.nome), datasets: [{ label: 'Máximo', data: machineTotals.map(m => m.maximo || 0), backgroundColor: 'rgba(140,105,172,0.3)', borderRadius: 6 }, { label: 'Utilizado', data: machineTotals.map(m => m.total), backgroundColor: '#8c69ac', borderRadius: 6 }] };

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e8e8f0' } } }, scales: { x: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } } } };
  const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', padding: 16 } } } };

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><Link href="/maquinetas" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FiArrowLeft size={14} /> Voltar</Link><h1 className="page-title">Relatórios - Maquinetas</h1></div><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div>
      <div className="card-grid"><div className="stat-card"><span className="stat-label">Total Geral</span><span className="stat-value">{formatCurrency(grandTotal)}</span></div><div className="stat-card"><span className="stat-label">Total de Registros</span><span className="stat-value">{totalRecords}</span></div><div className="stat-card"><span className="stat-label">Maquinetas Ativas</span><span className="stat-value">{machines.length}</span></div></div>
      {totalRecords === 0 ? (<div className="card" style={{ marginTop: '24px' }}><div className="no-data">Nenhum dado disponível</div></div>) : (<div className="charts-grid"><div className="chart-card"><h3>Total por Maquineta</h3><div className="chart-container"><Bar data={barData} options={chartOptions} /></div></div><div className="chart-card"><h3>Status das Notas</h3><div className="chart-container"><Doughnut data={doughnutData} options={doughnutOptions} /></div></div><div className="chart-card" style={{ gridColumn: '1 / -1' }}><h3>Máximo vs Utilizado</h3><div className="chart-container"><Bar data={maxCompData} options={chartOptions} /></div></div><div className="chart-card" style={{ gridColumn: '1 / -1' }}><h3>Detalhamento por Maquineta</h3><div className="table-wrapper"><table><thead><tr><th>Maquineta</th><th>Máximo</th><th>Total</th><th>Utilizado</th><th>Registros</th></tr></thead><tbody>{machineTotals.map(m => { const pct = m.maximo > 0 ? ((m.total / m.maximo) * 100).toFixed(1) + '%' : '-'; return (<tr key={m.id}><td>{m.nome}</td><td>{formatCurrency(m.maximo || 0)}</td><td>{formatCurrency(m.total)}</td><td>{pct}</td><td>{(allRecords[m.id] || []).length}</td></tr>); })}</tbody></table></div></div></div>)}
    </>
  );
}
