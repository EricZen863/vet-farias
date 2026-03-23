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
    { href: '/laboratorio', icon: FiDroplet, title: 'Laboratório', value: stats.labTotal, desc: 'Total a pagar este mês' },
    { href: '/volantes-cirurgioes', icon: FiScissors, title: 'Volantes Cirurgiões', value: stats.cirurgioesTotal, desc: 'Total pago este mês' },
    { href: '/volantes-imagem', icon: FiMonitor, title: 'Volantes Imagem', value: stats.imagemTotal, desc: 'Total pago este mês' },
    { href: '/gastos', icon: FiDollarSign, title: 'Gastos Diversos', value: stats.gastosTotal, desc: 'Total gasto este mês' },
    { href: '/maquinetas', icon: FiCreditCard, title: 'Maquinetas', value: stats.maquinetasTotal, desc: 'Total recebido este mês' },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral — {getMonthLabel(monthKey)}</p>
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
