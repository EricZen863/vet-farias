'use client';
import { useAuth } from '../components/AuthProvider';
import { useState, useEffect } from 'react';
import { getMonthKey, getMonthLabel } from '../lib/storage';
import Link from 'next/link';
import { FiDroplet, FiScissors, FiMonitor, FiDollarSign, FiCreditCard } from 'react-icons/fi';

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey] = useState(getMonthKey());
  const [stats, setStats] = useState({ labTotal: 0, cirurgioesTotal: 0, imagemTotal: 0, gastosTotal: 0, maquinetasTotal: 0 });

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/dashboard?month=${monthKey}`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, [isAuthenticated, monthKey]);

  if (loading || !isAuthenticated) return null;
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const cards = [
    { href: '/laboratorio', icon: FiDroplet, title: 'Laborat\u00f3rio', value: stats.labTotal, desc: 'Total a pagar este m\u00eas' },
    { href: '/volantes-cirurgioes', icon: FiScissors, title: 'Volantes Cirurgi\u00f5es', value: stats.cirurgioesTotal, desc: 'Total pago este m\u00eas' },
    { href: '/volantes-imagem', icon: FiMonitor, title: 'Volantes Imagem', value: stats.imagemTotal, desc: 'Total pago este m\u00eas' },
    { href: '/gastos', icon: FiDollarSign, title: 'Gastos Diversos', value: stats.gastosTotal, desc: 'Total gasto este m\u00eas' },
    { href: '/maquinetas', icon: FiCreditCard, title: 'Maquinetas', value: stats.maquinetasTotal, desc: 'Total recebido este m\u00eas' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Vis\u00e3o geral \u2014 {getMonthLabel(monthKey)}</p>
      </div>
      <div className="dashboard-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="dashboard-card">
            <div className="dashboard-card-icon"><card.icon size={24} /></div>
            <h3>{card.title}</h3>
            <div className="value">{formatCurrency(card.value)}</div>
            <div className="detail">{card.desc}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
