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

export default function ImagemRelatoriosPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [records, setRecords] = useState([]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/records?module=imagem&month=${monthKey}`)
      .then(r => r.json()).then(setRecords).catch(() => {});
  }, [isAuthenticated, monthKey]);
  if (loading || !isAuthenticated) return null;
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const total = records.reduce((s, r) => s + r.valor, 0);
  const exameCounts = {}; const profTotals = {};
  records.forEach(r => { exameCounts[r.exame] = (exameCounts[r.exame] || 0) + 1; profTotals[r.nome] = (profTotals[r.nome] || 0) + r.valor; });
  const sortedExames = Object.entries(exameCounts).sort((a, b) => b[1] - a[1]);
  const sortedProfs = Object.entries(profTotals).sort((a, b) => b[1] - a[1]);
  const pieData = { labels: sortedExames.map(([n]) => n), datasets: [{ data: sortedExames.map(([, c]) => c), backgroundColor: chartColors, borderWidth: 0 }] };
  const barData = { labels: sortedProfs.map(([n]) => n), datasets: [{ label: 'Total Pago (R$)', data: sortedProfs.map(([, v]) => v), backgroundColor: chartColors, borderRadius: 6 }] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e8e8f0' } } }, scales: { x: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } } } };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', padding: 16 } } } };

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><Link href="/volantes-imagem" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FiArrowLeft size={14} /> Voltar</Link><h1 className="page-title">Relatórios - Volantes Exames de Imagem</h1></div><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div>
      <div className="card-grid"><div className="stat-card"><span className="stat-label">Total de Exames</span><span className="stat-value">{records.length}</span></div><div className="stat-card"><span className="stat-label">Total Pago</span><span className="stat-value">{formatCurrency(total)}</span></div><div className="stat-card"><span className="stat-label">Profissionais Ativos</span><span className="stat-value">{Object.keys(profTotals).length}</span></div></div>
      {records.length === 0 ? (<div className="card" style={{ marginTop: '24px' }}><div className="no-data">Nenhum dado disponível</div></div>) : (<div className="charts-grid"><div className="chart-card"><h3>Distribuição por Tipo de Exame</h3><div className="chart-container"><Pie data={pieData} options={pieOptions} /></div></div><div className="chart-card"><h3>Ranking de Profissionais</h3><div className="chart-container"><Bar data={barData} options={chartOptions} /></div></div><div className="chart-card" style={{ gridColumn: '1 / -1' }}><h3>Detalhamento</h3><div className="table-wrapper"><table><thead><tr><th>Profissional</th><th>Exames</th><th>Total Pago</th></tr></thead><tbody>{sortedProfs.map(([name, value]) => (<tr key={name}><td>{name}</td><td>{records.filter(r => r.nome === name).length}</td><td>{formatCurrency(value)}</td></tr>))}</tbody></table></div></div></div>)}
    </>
  );
}
