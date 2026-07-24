'use client';
import { useAuth } from '../components/AuthProvider';
import { useState, useEffect } from 'react';
import { getMonthKey, getMonthLabel } from '../lib/storage';
import Link from 'next/link';
import {
  FiDroplet, FiScissors, FiMonitor, FiDollarSign, FiCreditCard,
  FiLayout, FiClock, FiCheckSquare, FiArrowRight
} from 'react-icons/fi';

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey] = useState(getMonthKey());
  const [stats, setStats] = useState({ labTotal: 0, cirurgioesTotal: 0, imagemTotal: 0, gastosTotal: 0, maquinetasTotal: 0 });
  const [kanbanSummary, setKanbanSummary] = useState({ totalCards: 0, aFazer: 0, emAndamento: 0, concluido: 0, recentCards: [] });
  const [remindersCount, setRemindersCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Métricas financeiras
    fetch(`/api/dashboard?month=${monthKey}`)
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});

    // Resumo do Kanban
    fetch('/api/kanban/boards')
      .then(r => r.json())
      .then(boards => {
        if (boards.length > 0 && boards[0].columns) {
          const cols = boards[0].columns;
          const aFazerCol = cols.find(c => c.nome === 'A Fazer');
          const emAndamentoCol = cols.find(c => c.nome === 'Em Andamento');
          const concluidoCol = cols.find(c => c.nome === 'Concluído');

          const allCards = cols.flatMap(c => c.cards || []);
          const pendingCards = allCards.filter(c => {
            const col = cols.find(col => col.id === c.column_id);
            return col && col.nome !== 'Concluído';
          }).slice(0, 5);

          setKanbanSummary({
            totalCards: allCards.length,
            aFazer: aFazerCol?.cards.length || 0,
            emAndamento: emAndamentoCol?.cards.length || 0,
            concluido: concluidoCol?.cards.length || 0,
            recentCards: pendingCards
          });
        }
      })
      .catch(() => {});

    // Lembretes Diários
    fetch('/api/reminders')
      .then(r => r.json())
      .then(list => setRemindersCount(list.length || 0))
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

  const priorityColors = {
    alta: '#f87171',
    media: '#fbbf24',
    baixa: '#4ade80'
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral — {getMonthLabel(monthKey)}</p>
      </div>

      {/* Cards Financeiros */}
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

      {/* Seção Resumo do Kanban & Lembretes */}
      <div style={{ marginTop: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiLayout style={{ fontSize: '22px', color: 'var(--primary-light)' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Resumo do Kanban & Lembretes</h2>
          </div>
          <Link
            href="/kanban"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', textDecoration: 'none' }}
          >
            Abrir Kanban Completo <FiArrowRight />
          </Link>
        </div>

        {/* Resumo em Cards e Tarefas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Métricas Rápidas */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>Status das Tarefas</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>A Fazer</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>{kanbanSummary.aFazer}</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Em Andamento</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>{kanbanSummary.emAndamento}</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Concluídas</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80', marginTop: '4px' }}>{kanbanSummary.concluido}</div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lembretes Diários</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary-light)', marginTop: '4px' }}>{remindersCount}</div>
              </div>
            </div>
          </div>

          {/* Tarefas Pendentes Recentes */}
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Próximas Tarefas Pendentes</h3>

            {kanbanSummary.recentCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Nenhuma tarefa pendente no momento 🎉
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {kanbanSummary.recentCards.map(c => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: priorityColors[c.prioridade] || '#fbbf24'
                      }} />
                      <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{c.titulo}</strong>
                    </div>

                    {c.dues_at && (
                      <span style={{ fontSize: '11px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiClock /> {new Date(c.dues_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
