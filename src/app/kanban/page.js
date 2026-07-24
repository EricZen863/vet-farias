'use client';

import { useState, useEffect } from 'react';
import {
  FiPlus, FiClock, FiTrash2, FiChevronRight, FiChevronLeft, FiCheckCircle
} from 'react-icons/fi';

export default function KanbanPage() {
  const [columns, setColumns] = useState([]);
  const [boardId, setBoardId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showCardModal, setShowCardModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminders, setReminders] = useState([]);

  // Form de Novo Cartão
  const [cardForm, setCardForm] = useState({
    column_id: null,
    titulo: '',
    descricao: '',
    prioridade: 'media',
    dues_at: ''
  });

  // Form de Lembrete Diário Recorrente
  const [reminderForm, setReminderForm] = useState({
    titulo: '',
    descricao: '',
    horario: '08:00',
    column_id: null
  });

  const loadData = async () => {
    try {
      const res = await fetch('/api/kanban/boards');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const board = data[0];
          setBoardId(board.id);
          setColumns(board.columns || []);
          if (board.columns && board.columns.length > 0) {
            const firstColId = board.columns[0].id;
            setCardForm(prev => ({ ...prev, column_id: prev.column_id || firstColId }));
            setReminderForm(prev => ({ ...prev, column_id: prev.column_id || firstColId }));
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar Kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (err) {
      console.error('Erro ao carregar lembretes:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadReminders();
  }, []);

  const openNewCardModal = (colId) => {
    setCardForm(prev => ({
      ...prev,
      column_id: colId || (columns.length > 0 ? columns[0].id : null)
    }));
    setShowCardModal(true);
  };

  const openReminderModal = () => {
    if (columns.length > 0) {
      setReminderForm(prev => ({ ...prev, column_id: prev.column_id || columns[0].id }));
    }
    setShowReminderModal(true);
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!cardForm.titulo || !cardForm.column_id) return;

    try {
      const res = await fetch('/api/kanban/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column_id: cardForm.column_id,
          titulo: cardForm.titulo,
          descricao: cardForm.descricao,
          prioridade: cardForm.prioridade,
          dues_at: cardForm.dues_at ? new Date(cardForm.dues_at).toISOString() : null
        })
      });

      if (res.ok) {
        setShowCardModal(false);
        setCardForm({ column_id: columns[0]?.id || null, titulo: '', descricao: '', prioridade: 'media', dues_at: '' });
        loadData();
      }
    } catch (err) {
      console.error('Erro ao criar cartão:', err);
    }
  };

  const handleMoveCard = async (cardId, currentColumnId, direction) => {
    const currentIndex = columns.findIndex(c => c.id === currentColumnId);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const targetColumn = columns[targetIndex];

    try {
      const res = await fetch('/api/kanban/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, new_column_id: targetColumn.id })
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error('Erro ao mover cartão:', err);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Deseja excluir este cartão?')) return;
    try {
      const res = await fetch(`/api/kanban/cards?id=${cardId}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch (err) {
      console.error('Erro ao excluir cartão:', err);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.titulo || !reminderForm.horario) return;

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: reminderForm.titulo,
          descricao: reminderForm.descricao,
          horario: reminderForm.horario,
          prioridade: reminderForm.prioridade || 'media',
          dias_semana: [0, 1, 2, 3, 4, 5, 6]
        })
      });

      if (res.ok) {
        setReminderForm({ titulo: '', descricao: '', horario: '08:00', prioridade: 'media' });
        loadReminders();
      }
    } catch (err) {
      console.error('Erro ao criar lembrete diário:', err);
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      if (res.ok) loadReminders();
    } catch (err) {
      console.error('Erro ao excluir lembrete:', err);
    }
  };

  const priorityColors = {
    alta: { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171', border: 'rgba(248, 113, 113, 0.3)' },
    media: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
    baixa: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80', border: 'rgba(74, 222, 128, 0.3)' }
  };

  const handleTestNotification = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Seu navegador não suporta notificações Push.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permissão de notificação negada no navegador. Habilite nas configurações do site (ícone de cadeado na barra de endereço).');
        return;
      }

      // Garantir inscricao no banco
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const VAPID_PUBLIC_KEY = 'BDJIX3Y8rAmuSTQh7lfueSHZOnkeUoYtd3USOKM6-1sf1TlxSxq2wJSvSCrBzQ1H-19jEvS3mTirjAn2enrw_eo';
        const padding = '='.repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
        const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });
      }

      // Enviar inscricao para o backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent
        })
      });

      // Disparar teste
      const res = await fetch('/api/push/test-notification', { method: 'POST' });
      const json = await res.json();

      if (res.ok) {
        alert('Notificação de teste enviada! Se você não vir um popup na tela, verifique a Central de Notificações do Windows.');
      } else {
        alert('Erro ao disparar teste: ' + (json.error || 'Erro desconhecido.'));
      }
    } catch (err) {
      alert('Erro ao testar notificação: ' + err.message);
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header da Página */}
      <div className="page-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Kanban & Lembretes</h1>
          <p className="page-subtitle">Gerencie tarefas e receba notificações Push de lembretes diários no celular e computador.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleTestNotification}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--primary-light)', color: 'var(--primary-light)' }}
          >
            <FiClock /> Testar Notificação Push
          </button>
          <button
            onClick={openReminderModal}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiClock /> Lembretes Diários ({reminders.length})
          </button>
          <button
            onClick={() => openNewCardModal(null)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiPlus /> Novo Cartão
          </button>
        </div>
      </div>

      {/* Quadro Kanban */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Carregando Kanban...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns.length || 3}, minmax(280px, 1fr))`,
          gap: '20px',
          alignItems: 'start',
          overflowX: 'auto'
        }}>
          {columns.map((col, cIdx) => (
            <div
              key={col.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                padding: '16px',
                minHeight: '420px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header da Coluna */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: col.nome === 'A Fazer' ? '#fbbf24' : col.nome === 'Em Andamento' ? '#60a5fa' : '#4ade80'
                  }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{col.nome}</h3>
                </div>
                <span style={{
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-input)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  color: 'var(--text-secondary)'
                }}>
                  {col.cards.length}
                </span>
              </div>

              {/* Cartões da Coluna */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {col.cards.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Sem tarefas nesta coluna
                  </div>
                ) : (
                  col.cards.map(card => {
                    const prio = priorityColors[card.prioridade] || priorityColors.media;
                    return (
                      <div
                        key={card.id}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: prio.bg,
                            color: prio.text,
                            border: `1px solid ${prio.border}`,
                            textTransform: 'uppercase'
                          }}>
                            {card.prioridade}
                          </span>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                            title="Excluir"
                          >
                            <FiTrash2 />
                          </button>
                        </div>

                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{card.titulo}</h4>

                        {card.descricao && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                            {card.descricao}
                          </p>
                        )}

                        {card.dues_at && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: card.lembrete_enviado ? 'var(--success)' : 'var(--warning)', marginTop: '4px' }}>
                            <FiClock /> {new Date(card.dues_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            {card.lembrete_enviado && <span style={{ fontSize: '10px' }}>(Lembrete Enviado)</span>}
                          </div>
                        )}

                        {/* Mover Cartão */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                          {cIdx > 0 ? (
                            <button
                              onClick={() => handleMoveCard(card.id, col.id, 'prev')}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '2px' }}
                            >
                              <FiChevronLeft /> Anterior
                            </button>
                          ) : <div />}
                          {cIdx < columns.length - 1 ? (
                            <button
                              onClick={() => handleMoveCard(card.id, col.id, 'next')}
                              style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '2px' }}
                            >
                              Próximo <FiChevronRight />
                            </button>
                          ) : <div />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Botão Adicionar Cartão na Coluna */}
              <button
                onClick={() => openNewCardModal(col.id)}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: '1px dashed var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FiPlus /> Adicionar Cartão
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Cartão */}
      {showCardModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="login-card" style={{ maxWidth: '500px', width: '100%' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--primary-light)', marginBottom: '16px' }}>Criar Novo Cartão</h2>
            <form onSubmit={handleCreateCard} className="login-form">
              <div className="form-group">
                <label className="form-label">Título da Tarefa / Compromisso *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={cardForm.titulo}
                  onChange={e => setCardForm({ ...cardForm, titulo: e.target.value })}
                  placeholder="Ex: [Recepção] Retorno da Vacina Banzé"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Coluna Destino *</label>
                <select
                  className="form-input"
                  required
                  value={cardForm.column_id || ''}
                  onChange={e => setCardForm({ ...cardForm, column_id: parseInt(e.target.value) })}
                >
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição / Observações</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={cardForm.descricao}
                  onChange={e => setCardForm({ ...cardForm, descricao: e.target.value })}
                  placeholder="Detalhes adicionais da tarefa..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Prioridade</label>
                  <select
                    className="form-input"
                    value={cardForm.prioridade}
                    onChange={e => setCardForm({ ...cardForm, prioridade: e.target.value })}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Data/Hora Lembrete (Push)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={cardForm.dues_at}
                    onChange={e => setCardForm({ ...cardForm, dues_at: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Salvar Cartão</button>
                <button type="button" onClick={() => setShowCardModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerenciador de Lembretes Diários */}
      {showReminderModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="login-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--primary-light)', marginBottom: '8px' }}>⏰ Lembretes Diários Recorrentes</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Tarefas configuradas aqui enviarão uma notificação Push no horário programado todos os dias.
            </p>

            {/* Form de Novo Lembrete */}
            <form onSubmit={handleCreateReminder} style={{ backgroundColor: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>Novo Lembrete Recorrente</h3>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Título da Tarefa Diária *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={reminderForm.titulo}
                  onChange={e => setReminderForm({ ...reminderForm, titulo: e.target.value })}
                  placeholder="Ex: [Limpeza] Higienização dos canis"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Horário do Disparo (HH:mm) *</label>
                  <input
                    type="time"
                    className="form-input"
                    required
                    value={reminderForm.horario}
                    onChange={e => setReminderForm({ ...reminderForm, horario: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Prioridade</label>
                  <select
                    className="form-input"
                    value={reminderForm.prioridade || 'media'}
                    onChange={e => setReminderForm({ ...reminderForm, prioridade: e.target.value })}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '13px' }}>
                Cadastrar Lembrete Diário
              </button>
            </form>

            {/* Lista de Lembretes Programados */}
            <h3 style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>Lembretes Programados ({reminders.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reminders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Nenhum lembrete diário cadastrado ainda.
                </div>
              ) : (
                reminders.map(r => {
                  const prio = priorityColors[r.prioridade] || priorityColors.media;
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--text)' }}>{r.titulo}</strong>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: prio.bg,
                            color: prio.text,
                            border: `1px solid ${prio.border}`,
                            textTransform: 'uppercase'
                          }}>
                            {r.prioridade || 'media'}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--primary-light)', marginTop: '2px', display: 'block' }}>⏰ Todos os dias às {r.horario} hs</span>
                      </div>
                      <button
                        onClick={() => handleDeleteReminder(r.id)}
                        className="btn-danger btn-small"
                      >
                        Remover
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setShowReminderModal(false)} className="btn-secondary">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
