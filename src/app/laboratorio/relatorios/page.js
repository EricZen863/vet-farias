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

  const normalRecords = records.filter(r => r.tipo !== 'plano');
  const planoRecords = records.filter(r => r.tipo === 'plano');

  // Custos e lucros da clínica são computados apenas sobre pedidos normais (planos não têm custo para a clínica)
  const total = normalRecords.reduce((s, r) => s + (r.precoCusto || 0), 0);
  const totalRepasse = normalRecords.reduce((s, r) => s + (r.repasse || 0), 0);
  const totalLucro = normalRecords.reduce((s, r) => s + (r.lucro || 0), 0);

  const coletaCounts = {};
  records.forEach(r => { coletaCounts[r.coleta] = (coletaCounts[r.coleta] || 0) + 1; });
  const sortedColetas = Object.entries(coletaCounts).sort((a, b) => b[1] - a[1]);
  const top10 = sortedColetas.slice(0, 10);

  const barData = {
    labels: top10.map(([n]) => n.length > 20 ? n.substring(0, 20) + '...' : n),
    datasets: [{
      label: 'Quantidade',
      data: top10.map(([, c]) => c),
      backgroundColor: chartColors.slice(0, top10.length),
      borderRadius: 6
    }]
  };

  const pieData = {
    labels: ['Custo Lab (Normais)', 'Lucro (Normais)'],
    datasets: [{
      data: [total, totalLucro],
      backgroundColor: ['#f87171', '#4ade80'],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#e8e8f0' } } },
    scales: {
      x: { ticks: { color: '#9898b0', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#9898b0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', padding: 16 } } }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <Link href="/laboratorio" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <FiArrowLeft size={14} /> Voltar
            </Link>
            <h1 className="page-title">Relatórios - Laboratório</h1>
          </div>
          <MonthSelector value={monthKey} onChange={setMonthKey} />
        </div>
      </div>

      <div className="card-grid">
        <div className="stat-card">
          <span className="stat-label">Total de Coletas</span>
          <span className="stat-value">{records.length}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {normalRecords.length} normais / {planoRecords.length} planos
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Custo Total Lab (A Pagar)</span>
          <span className="stat-value">{formatCurrency(total)}</span>
          <span style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px' }}>
            {planoRecords.length} de plano (isento)
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Repassado</span>
          <span className="stat-value">{formatCurrency(totalRepasse)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Lucro Total Clínica</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalLucro)}</span>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="no-data">Nenhum dado disponível</div>
        </div>
      ) : (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Coletas Mais Frequentes</h3>
            <div className="chart-container"><Bar data={barData} options={chartOptions} /></div>
          </div>
          <div className="chart-card">
            <h3>Custo vs Lucro (Pedidos Normais)</h3>
            <div className="chart-container"><Pie data={pieData} options={pieOptions} /></div>
          </div>
          <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Detalhamento por Tipo de Coleta</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Coleta</th>
                    <th>Total Pedidos</th>
                    <th>Normais</th>
                    <th>Planos</th>
                    <th>Custo Lab</th>
                    <th>Repasse Total</th>
                    <th>Lucro Clínica</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedColetas.map(([name, count]) => {
                    const recs = records.filter(r => r.coleta === name);
                    const normais = recs.filter(r => r.tipo !== 'plano');
                    const planos = recs.filter(r => r.tipo === 'plano');
                    const custoNormais = normais.reduce((s, r) => s + (r.precoCusto || 0), 0);
                    const repasseNormais = normais.reduce((s, r) => s + (r.repasse || 0), 0);
                    const lucroNormais = normais.reduce((s, r) => s + (r.lucro || 0), 0);

                    return (
                      <tr key={name}>
                        <td><strong>{name}</strong></td>
                        <td>{count}</td>
                        <td style={{ color: 'var(--primary-light)' }}>{normais.length}</td>
                        <td style={{ color: '#38bdf8' }}>{planos.length}</td>
                        <td>{formatCurrency(custoNormais)}</td>
                        <td>{formatCurrency(repasseNormais)}</td>
                        <td style={{ color: 'var(--success)' }}>{formatCurrency(lucroNormais)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}