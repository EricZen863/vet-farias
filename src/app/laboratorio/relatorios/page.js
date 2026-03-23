'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthProvider';
import MonthSelector from '../../../components/MonthSelector';
import { loadData, getMonthKey } from '../../../lib/storage';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);
const chartColors = ['#8c69ac', '#a889c4', '#6b4d8a', '#c4a8e0', '#d4bde8', '#4ade80', '#fbbf24', '#f87171', '#38bdf8', '#fb923c'];

export default function LabRelatoriosPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [labs, setLabs] = useState([]);
  const [allRecords, setAllRecords] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const savedLabs = loadData('lab', 'labs', [{ id: 1, nome: 'Laboratório 1', active: true, catalog: [] }]);
    setLabs(savedLabs);
    let all = [];
    savedLabs.forEach(lab => {
      const records = loadData('lab', `records_${lab.id}_${monthKey}`, []);
      all = [...all, ...records.map(r => ({ ...r, labNome: lab.nome }))];
    });
    setAllRecords(all);
  }, [isAuthenticated, monthKey]);

  if (loading || !isAuthenticated) return null;
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalCusto = allRecords.reduce((s, r) => s + (r.precoCusto || 0), 0);
  const totalLucro = allRecords.reduce((s, r) => s + (r.lucro || 0), 0);
  const coletaCounts = {};
  allRecords.forEach(r => { coletaCounts[r.coleta] = (coletaCounts[r.coleta] || 0) + 1; });
  const sortedColetas = Object.entries(coletaCounts).sort((a, b) => b[1] - a[1]);
  const barData = { labels: sortedColetas.slice(0, 10).map(([n]) => n.length > 20 ? n.substring(0, 20) + '...' : n), datasets: [{ label: 'Quantidade', data: sortedColetas.slice(0, 10).map(([, c]) => c), backgroundColor: chartColors, borderRadius: 6 }] };
  const coletaCusto = {};
  allRecords.forEach(r => { coletaCusto[r.coleta] = (coletaCusto[r.coleta] || 0) + (r.precoCusto || 0); });
  const sortedCustos = Object.entries(coletaCusto).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const pieData = { labels: sortedCustos.map(([n]) => n.length > 20 ? n.substring(0, 20) + '...' : n), datasets: [{ data: sortedCustos.map(([, v]) => v), backgroundColor: chartColors, borderWidth: 0 }] };
  const compData = { labels: ['Custo Total', 'Lucro Total'], datasets: [{ label: 'R$', data: [totalCusto, totalLucro], backgroundColor: ['#f87171', '#4ade80'], borderRadius: 6 }] };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e8e8f0' } } }, scales: { x: { ticks: { color: '#9898b0', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } } } };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', padding: 16 } } } };

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><Link href="/laboratorio" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FiArrowLeft size={14} /> Voltar</Link><h1 className="page-title">Relatórios - Laboratório</h1></div><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div>
      <div className="card-grid"><div className="stat-card"><span className="stat-label">Total de Coletas</span><span className="stat-value">{allRecords.length}</span></div><div className="stat-card"><span className="stat-label">Custo Total</span><span className="stat-value">{formatCurrency(totalCusto)}</span></div><div className="stat-card"><span className="stat-label">Lucro Total</span><span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalLucro)}</span></div></div>
      {allRecords.length === 0 ? (<div className="card" style={{ marginTop: '24px' }}><div className="no-data">Nenhum dado disponível</div></div>) : (<div className="charts-grid"><div className="chart-card"><h3>Coletas Mais Frequentes</h3><div className="chart-container"><Bar data={barData} options={chartOptions} /></div></div><div className="chart-card"><h3>Distribuição de Custos</h3><div className="chart-container"><Pie data={pieData} options={pieOptions} /></div></div><div className="chart-card"><h3>Custo vs Lucro</h3><div className="chart-container"><Bar data={compData} options={chartOptions} /></div></div><div className="chart-card"><h3>Detalhamento por Coleta</h3><div className="table-wrapper"><table><thead><tr><th>Coleta</th><th>Qtd</th><th>Custo Total</th></tr></thead><tbody>{sortedColetas.map(([name, count]) => (<tr key={name}><td>{name}</td><td>{count}</td><td>{formatCurrency(coletaCusto[name] || 0)}</td></tr>))}</tbody></table></div></div></div>)}
    </>
  );
}
