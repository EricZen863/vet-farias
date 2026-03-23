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
const chartColors = ['#8c69ac', '#a889c4', '#6b4d8a', '#c4a8e0', '#4ade80', '#fbbf24', '#f87171', '#38bdf8'];

export default function MaquinetasRelatoriosPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [machines, setMachines] = useState([]);
  const [records, setRecords] = useState({});
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/maquinetas?month=${monthKey}`)
      .then(r => r.json())
      .then(result => { setMachines(result.machines || []); setRecords(result.records || {}); })
      .catch(() => {});
  }, [isAuthenticated, monthKey]);
  if (loading || !isAuthenticated) return null;
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const machineTotals = machines.map(m => ({ nome: m.nome, maximo: m.maximo, total: (records[m.id] || []).reduce((s, r) => s + r.valor, 0), count: (records[m.id] || []).length }));
  const grandTotal = machineTotals.reduce((s, m) => s + m.total, 0);
  const totalRecords = machineTotals.reduce((s, m) => s + m.count, 0);
  const barData = { labels: machineTotals.map(m => m.nome), datasets: [{ label: 'Recebido (R$)', data: machineTotals.map(m => m.total), backgroundColor: chartColors.slice(0, machineTotals.length), borderRadius: 6 }, { label: 'Limite (R$)', data: machineTotals.map(m => m.maximo), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6 }] };
  const pieData = { labels: machineTotals.map(m => m.nome), datasets: [{ data: machineTotals.map(m => m.total), backgroundColor: chartColors, borderWidth: 0 }] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e8e8f0' } } }, scales: { x: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } } } };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', padding: 16 } } } };

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><Link href="/maquinetas" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FiArrowLeft size={14} /> Voltar</Link><h1 className="page-title">Relatórios - Maquinetas</h1></div><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div>
      <div className="card-grid"><div className="stat-card"><span className="stat-label">Total de Transações</span><span className="stat-value">{totalRecords}</span></div><div className="stat-card"><span className="stat-label">Total Recebido</span><span className="stat-value">{formatCurrency(grandTotal)}</span></div><div className="stat-card"><span className="stat-label">Maquinetas Ativas</span><span className="stat-value">{machines.length}</span></div></div>
      {totalRecords === 0 ? (<div className="card" style={{ marginTop: '24px' }}><div className="no-data">Nenhum dado disponível</div></div>) : (<div className="charts-grid"><div className="chart-card"><h3>Recebido vs Limite por Maquineta</h3><div className="chart-container"><Bar data={barData} options={chartOptions} /></div></div><div className="chart-card"><h3>Distribuição</h3><div className="chart-container"><Pie data={pieData} options={pieOptions} /></div></div><div className="chart-card" style={{ gridColumn: '1 / -1' }}><h3>Detalhamento</h3><div className="table-wrapper"><table><thead><tr><th>Maquineta</th><th>Transações</th><th>Total Recebido</th><th>Limite</th><th>Uso</th></tr></thead><tbody>{machineTotals.map((m) => (<tr key={m.nome}><td>{m.nome}</td><td>{m.count}</td><td>{formatCurrency(m.total)}</td><td>{m.maximo > 0 ? formatCurrency(m.maximo) : '—'}</td><td>{m.maximo > 0 ? `${Math.min((m.total / m.maximo) * 100, 100).toFixed(0)}%` : '—'}</td></tr>))}</tbody></table></div></div></div>)}
    </>
  );
}
