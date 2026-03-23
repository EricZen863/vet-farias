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
const chartColors = ['#8c69ac', '#a889c4', '#6b4d8a', '#c4a8e0', '#4ade80', '#fbbf24', '#f87171', '#38bdf8', '#fb923c', '#e879f9'];

export default function GastosRelatoriosPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [records, setRecords] = useState([]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/records?module=gastos&month=${monthKey}`)
      .then(r => r.json()).then(setRecords).catch(() => {});
  }, [isAuthenticated, monthKey]);
  if (loading || !isAuthenticated) return null;
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const total = records.reduce((s, r) => s + r.valor, 0);
  const avg = records.length > 0 ? total / records.length : 0;
  const gastoGroups = {};
  records.forEach(r => { gastoGroups[r.descricao] = (gastoGroups[r.descricao] || 0) + r.valor; });
  const sortedGastos = Object.entries(gastoGroups).sort((a, b) => b[1] - a[1]);
  const top10 = sortedGastos.slice(0, 10);
  const barData = { labels: top10.map(([n]) => n.length > 25 ? n.substring(0, 25) + '...' : n), datasets: [{ label: 'Valor (R$)', data: top10.map(([, v]) => v), backgroundColor: chartColors.slice(0, top10.length), borderRadius: 6 }] };
  const pieData = { labels: top10.map(([n]) => n.length > 20 ? n.substring(0, 20) + '...' : n), datasets: [{ data: top10.map(([, v]) => v), backgroundColor: chartColors, borderWidth: 0 }] };
  const dailyTotals = {};
  records.forEach(r => { const day = new Date(r.data).toLocaleDateString('pt-BR'); dailyTotals[day] = (dailyTotals[day] || 0) + r.valor; });
  const sortedDays = Object.entries(dailyTotals).sort((a, b) => { const [dA, mA, yA] = a[0].split('/'); const [dB, mB, yB] = b[0].split('/'); return new Date(yA, mA - 1, dA) - new Date(yB, mB - 1, dB); });
  const dailyBarData = { labels: sortedDays.map(([d]) => d), datasets: [{ label: 'Gastos por Dia (R$)', data: sortedDays.map(([, v]) => v), backgroundColor: '#8c69ac', borderRadius: 6 }] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e8e8f0' } } }, scales: { x: { ticks: { color: '#9898b0', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } } } };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', padding: 16, font: { size: 11 } } } } };

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><Link href="/gastos" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FiArrowLeft size={14} /> Voltar</Link><h1 className="page-title">Relat\u00f3rios - Gastos Diversos</h1></div><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div>
      <div className="card-grid"><div className="stat-card"><span className="stat-label">Total de Registros</span><span className="stat-value">{records.length}</span></div><div className="stat-card"><span className="stat-label">Total Gasto</span><span className="stat-value">{formatCurrency(total)}</span></div><div className="stat-card"><span className="stat-label">M\u00e9dia por Gasto</span><span className="stat-value">{formatCurrency(avg)}</span></div></div>
      {records.length === 0 ? (<div className="card" style={{ marginTop: '24px' }}><div className="no-data">Nenhum dado dispon\u00edvel</div></div>) : (<div className="charts-grid"><div className="chart-card"><h3>Top Gastos do M\u00eas</h3><div className="chart-container"><Bar data={barData} options={chartOptions} /></div></div><div className="chart-card"><h3>Distribui\u00e7\u00e3o de Gastos</h3><div className="chart-container"><Pie data={pieData} options={pieOptions} /></div></div><div className="chart-card" style={{ gridColumn: '1 / -1' }}><h3>Gastos por Dia</h3><div className="chart-container"><Bar data={dailyBarData} options={chartOptions} /></div></div></div>)}
    </>
  );
}
