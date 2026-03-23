'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthProvider';
import MonthSelector from '../../../components/MonthSelector';
import { getMonthKey } from '../../../lib/storage';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);
const chartColors = ['#8c69ac', '#a889c4', '#6b4d8a', '#c4a8e0', '#d4bde8', '#4ade80', '#fbbf24', '#f87171', '#38bdf8', '#fb923c'];

export default function LabRelatoriosPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [records, setRecords] = useState([]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/records?module=lab&month=${monthKey}`)
      .then(r => r.json()).then(setRecords).catch(() => {});
  }, [isAuthenticated, monthKey]);
  if (loading || !isAuthenticated) return null;
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const total = records.reduce((s, r) => s + r.precoCusto, 0);
  const totalRepasse = records.reduce((s, r) => s + r.repasse, 0);
  const totalLucro = records.reduce((s, r) => s + r.lucro, 0);
  const coletaCounts = {};
  records.forEach(r => { coletaCounts[r.coleta] = (coletaCounts[r.coleta] || 0) + 1; });
  const sortedColetas = Object.entries(coletaCounts).sort((a, b) => b[1] - a[1]);
  const top10 = sortedColetas.slice(0, 10);
  const barData = { labels: top10.map(([n]) => n.length > 20 ? n.substring(0, 20) + '...' : n), datasets: [{ label: 'Quantidade', data: top10.map(([, c]) => c), backgroundColor: chartColors.slice(0, top10.length), borderRadius: 6 }] };
  const pieData = { labels: ['Custo Lab', 'Lucro'], datasets: [{ data: [total, totalLucro], backgroundColor: ['#f87171', '#4ade80'], borderWidth: 0 }] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e8e8f0' } } }, scales: { x: { ticks: { color: '#9898b0', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } } } };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', padding: 16 } } } };

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><Link href="/laboratorio" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FiArrowLeft size={14} /> Voltar</Link><h1 className="page-title">Relat\u00f3rios - Laborat\u00f3rio</h1></div><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div>
      <div className="card-grid"><div className="stat-card"><span className="stat-label">Coletas Realizadas</span><span className="stat-value">{records.length}</span></div><div className="stat-card"><span className="stat-label">Custo Total Lab</span><span className="stat-value">{formatCurrency(total)}</span></div><div className="stat-card"><span className="stat-label">Total Repassado</span><span className="stat-value">{formatCurrency(totalRepasse)}</span></div><div className="stat-card"><span className="stat-label">Lucro Total</span><span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalLucro)}</span></div></div>
      {records.length === 0 ? (<div className="card" style={{ marginTop: '24px' }}><div className="no-data">Nenhum dado dispon\u00edvel</div></div>) : (<div className="charts-grid"><div className="chart-card"><h3>Coletas Mais Frequentes</h3><div className="chart-container"><Bar data={barData} options={chartOptions} /></div></div><div className="chart-card"><h3>Custo vs Lucro</h3><div className="chart-container"><Pie data={pieData} options={pieOptions} /></div></div><div className="chart-card" style={{ gridColumn: '1 / -1' }}><h3>Detalhamento por Tipo de Coleta</h3><div className="table-wrapper"><table><thead><tr><th>Coleta</th><th>Quantidade</th><th>Custo Total</th><th>Repasse Total</th><th>Lucro Total</th></tr></thead><tbody>{sortedColetas.map(([name, count]) => { const recs = records.filter(r => r.coleta === name); return (<tr key={name}><td>{name}</td><td>{count}</td><td>{formatCurrency(recs.reduce((s, r) => s + r.precoCusto, 0))}</td><td>{formatCurrency(recs.reduce((s, r) => s + r.repasse, 0))}</td><td>{formatCurrency(recs.reduce((s, r) => s + r.lucro, 0))}</td></tr>); })}</tbody></table></div></div></div>)}
    </>
  );
}
