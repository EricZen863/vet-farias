'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import {
  FiCheckSquare, FiSquare, FiPlus, FiTrash2, FiChevronLeft, FiChevronRight,
  FiCalendar, FiClock, FiEdit3, FiCheckCircle, FiSun, FiSunset, FiMoon, FiList, FiAlertCircle, FiMove,
  FiArrowUp, FiArrowDown
} from 'react-icons/fi';

function getTodayBrasilia() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return now.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, parseInt(month) - 1, day);
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChecklistPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayBrasilia());
  const [checklist, setChecklist] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, concluidos: 0, progresso: 0 });
  const [loading, setLoading] = useState(true);
  const [filterPeriodo, setFilterPeriodo] = useState('todos');

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPeriodo, setNewPeriodo] = useState('manha');
  const [newDescricao, setNewDescricao] = useState('');

  // Modal Observação
  const [obsModalItem, setObsModalItem] = useState(null);
  const [obsText, setObsText] = useState('');

  const todayStr = getTodayBrasilia();

  const loadChecklist = async (date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/checklist?data=${date}`);
      if (res.ok) {
        const data = await res.json();
        setChecklist(data.items || []);
        setMetrics({
          total: data.total || 0,
          concluidos: data.concluidos || 0,
          progresso: data.progresso || 0
        });
      }
    } catch (err) {
      console.error('Erro ao carregar checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadChecklist(selectedDate);
  }, [isAuthenticated, selectedDate]);

  const changeDateByDays = (days) => {
    const [y, m, d] = selectedDate.split('-');
    const dt = new Date(y, parseInt(m) - 1, parseInt(d));
    dt.setDate(dt.getDate() + days);
    const newDateStr = dt.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
  };

  const handleToggle = async (item) => {
    const nextState = !item.concluido;

    // Atualização otimista
    setChecklist(prev => prev.map(i => {
      if (i.template_id === item.template_id) {
        return {
          ...i,
          concluido: nextState,
          concluido_em: nextState ? new Date().toISOString() : null,
          concluido_por: nextState ? (user?.nome || 'Admin') : null
        };
      }
      return i;
    }));

    // Recalcular métricas localmente
    const newDone = metrics.concluidos + (nextState ? 1 : -1);
    setMetrics({
      total: metrics.total,
      concluidos: newDone,
      progresso: metrics.total > 0 ? Math.round((newDone / metrics.total) * 100) : 0
    });

    try {
      await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          template_id: item.template_id,
          data: selectedDate,
          concluido: nextState,
          concluido_por: user?.nome || 'Admin'
        })
      });
    } catch (err) {
      console.error('Erro ao alternar item:', err);
      loadChecklist(selectedDate);
    }
  };

  const handleSaveObservation = async (e) => {
    e.preventDefault();
    if (!obsModalItem) return;

    try {
      await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          template_id: obsModalItem.template_id,
          data: selectedDate,
          concluido: obsModalItem.concluido,
          observacao: obsText,
          concluido_por: obsModalItem.concluido_por || (user?.nome || 'Admin')
        })
      });

      setChecklist(prev => prev.map(i => {
        if (i.template_id === obsModalItem.template_id) {
          return { ...i, observacao: obsText };
        }
        return i;
      }));

      setObsModalItem(null);
      setObsText('');
    } catch (err) {
      console.error('Erro ao salvar observação:', err);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          titulo: newTitle.trim(),
          descricao: newDescricao.trim(),
          periodo: newPeriodo,
          ordem: checklist.length + 1
        })
      });

      if (res.ok) {
        setNewTitle('');
        setNewDescricao('');
        setShowAddModal(false);
        loadChecklist(selectedDate);
      }
    } catch (err) {
      console.error('Erro ao criar tarefa do checklist:', err);
    }
  };

  const handleDeleteTemplate = async (id, title) => {
    if (!confirm(`Deseja remover "${title}" da rotina diária?`)) return;

    // Atualização otimista imediata
    setChecklist(prev => prev.filter(i => i.template_id !== id));
    setMetrics(prev => {
      const removed = checklist.find(i => i.template_id === id);
      const newTotal = Math.max(0, prev.total - 1);
      const newDone = removed?.concluido ? Math.max(0, prev.concluidos - 1) : prev.concluidos;
      return {
        total: newTotal,
        concluidos: newDone,
        progresso: newTotal > 0 ? Math.round((newDone / newTotal) * 100) : 0
      };
    });

    try {
      const res = await fetch(`/api/checklist?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        alert('Erro ao excluir: ' + (errData.error || 'Falha no servidor'));
        loadChecklist(selectedDate);
      }
    } catch (err) {
      console.error('Erro ao excluir item:', err);
      alert('Erro de conexão ao excluir item.');
      loadChecklist(selectedDate);
    }
  };

  const handleDrop = async (targetItem, targetPeriodo, customSource = null) => {
    const source = customSource || draggedItem;
    if (!source || source.template_id === targetItem.template_id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Criar nova lista reordenada
    const currentList = [...checklist];
    const sourceIndex = currentList.findIndex(i => i.template_id === source.template_id);
    const targetIndex = currentList.findIndex(i => i.template_id === targetItem.template_id);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Remover da posição original e inserir na nova posição
    const [moved] = currentList.splice(sourceIndex, 1);
    moved.periodo = targetPeriodo;
    currentList.splice(targetIndex, 0, moved);

    // Reatribuir a propriedade ordem sequencialmente
    const updatedList = currentList.map((item, idx) => ({
      ...item,
      ordem: idx + 1
    }));

    // Atualização otimista imediata na interface
    setChecklist(updatedList);
    setDraggedItem(null);
    setDragOverItem(null);

    // Enviar a nova ordem para a API
    try {
      const payloadItems = updatedList.map(item => ({
        id: item.template_id,
        ordem: item.ordem,
        periodo: item.periodo
      }));

      await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder',
          items: payloadItems
        })
      });
    } catch (err) {
      console.error('Erro ao salvar nova ordem:', err);
      loadChecklist(selectedDate);
    }
  };

  const handleMoveStep = async (item, direction, periodItems) => {
    const currentIdx = periodItems.findIndex(i => i.template_id === item.template_id);
    if (currentIdx === -1) return;
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= periodItems.length) return;

    const targetItem = periodItems[targetIdx];
    await handleDrop(targetItem, item.periodo || 'manha', item);
  };

  if (authLoading || !isAuthenticated) return null;

  // Filtragem
  const filteredList = checklist.filter(item => {
    if (filterPeriodo === 'todos') return true;
    return item.periodo === filterPeriodo;
  });

  const periodosInfo = {
    manha: { label: 'Manhã / Abertura', icon: FiSun, color: '#f59e0b' },
    tarde: { label: 'Tarde / Rotina', icon: FiSunset, color: '#3b82f6' },
    noite: { label: 'Noite / Fechamento', icon: FiMoon, color: '#8b5cf6' },
    geral: { label: 'Geral / Outros', icon: FiList, color: '#10b981' }
  };

  // Agrupamento por turno
  const groupedByPeriodo = ['manha', 'tarde', 'noite', 'geral'].reduce((acc, p) => {
    const items = filteredList.filter(i => (i.periodo || 'manha') === p);
    if (items.length > 0) {
      acc[p] = items;
    }
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiCheckSquare style={{ color: 'var(--primary-light)' }} /> Checklist Diário
            </h1>
            <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>
              {formatDateLong(selectedDate)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Navegador de Data */}
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px' }}>
              <button
                className="btn-secondary"
                onClick={() => changeDateByDays(-1)}
                title="Dia anterior"
                style={{ padding: '6px 10px', border: 'none', background: 'transparent' }}
              >
                <FiChevronLeft size={16} />
              </button>
              
              <input
                type="date"
                value={selectedDate}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />

              <button
                className="btn-secondary"
                onClick={() => changeDateByDays(1)}
                title="Próximo dia"
                style={{ padding: '6px 10px', border: 'none', background: 'transparent' }}
              >
                <FiChevronRight size={16} />
              </button>
            </div>

            {selectedDate !== todayStr && (
              <button
                className="btn-secondary"
                onClick={() => setSelectedDate(todayStr)}
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                Voltar p/ Hoje
              </button>
            )}

            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
            >
              <FiPlus size={16} /> Nova Rotina
            </button>
          </div>
        </div>
      </div>

      {/* Card de Progresso do Dia */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Progresso do Dia
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {metrics.concluidos} de {metrics.total} tarefas concluídas
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: metrics.progresso === 100 ? '#10b981' : 'var(--primary-light)' }}>
            {metrics.progresso}%
          </div>
        </div>

        {/* Barra de Progresso */}
        <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--bg-input)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            height: '100%',
            width: `${metrics.progresso}%`,
            background: metrics.progresso === 100 
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, var(--primary), var(--primary-light))',
            borderRadius: '10px',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {metrics.progresso === 100 && metrics.total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
            <FiCheckCircle /> Excelente! Todas as rotinas deste dia foram cumpridas com sucesso.
          </div>
        )}
      </div>

      {/* Filtro por Turno */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { key: 'todos', label: 'Todas as Tarefas' },
          { key: 'manha', label: '🌅 Manhã' },
          { key: 'tarde', label: '☀️ Tarde' },
          { key: 'noite', label: '🌙 Noite' },
          { key: 'geral', label: '📋 Geral' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterPeriodo(tab.key)}
            className={filterPeriodo === tab.key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Tarefas Agrupadas por Turno */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Carregando checklist...
        </div>
      ) : Object.keys(groupedByPeriodo).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <FiAlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
          <p>Nenhuma tarefa cadastrada para este filtro.</p>
          <button className="btn-secondary" onClick={() => setShowAddModal(true)} style={{ marginTop: '12px', fontSize: '13px' }}>
            <FiPlus /> Adicionar Tarefa
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedByPeriodo).map(([periodoKey, items]) => {
            const pInfo = periodosInfo[periodoKey] || periodosInfo.geral;
            const Icon = pInfo.icon;
            const periodoConcluidos = items.filter(i => i.concluido).length;

            return (
              <div key={periodoKey} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      backgroundColor: `${pInfo.color}20`,
                      color: pInfo.color,
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={18} />
                    </div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                      {pInfo.label}
                    </h2>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {periodoConcluidos} de {items.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map((item, itemIdx) => {
                    const isDone = !!item.concluido;
                    const concluidoHorario = item.concluido_em
                      ? new Date(item.concluido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : null;

                    const isDragging = draggedItem?.template_id === item.template_id;
                    const isDragOver = dragOverItem?.template_id === item.template_id && !isDragging;

                    return (
                      <div
                        key={item.template_id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedItem(item);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverItem?.template_id !== item.template_id) {
                            setDragOverItem(item);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverItem?.template_id === item.template_id) {
                            setDragOverItem(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(item, periodoKey);
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverItem(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-input)',
                          border: isDragOver
                            ? '2px dashed var(--primary-light)'
                            : `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                          opacity: isDragging ? 0.35 : 1,
                          transform: isDragOver ? 'scale(1.01)' : 'none',
                          transition: 'all 0.15s ease',
                          gap: '10px'
                        }}
                      >
                        {/* Alça de Arrastar */}
                        <div
                          style={{
                            cursor: isDragging ? 'grabbing' : 'grab',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px 2px',
                            userSelect: 'none'
                          }}
                          title="Clique e arraste para reorganizar a ordem"
                        >
                          <FiMove size={15} />
                        </div>

                        <div
                          onClick={() => handleToggle(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            cursor: 'pointer',
                            flex: 1
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDone ? '#10b981' : 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px 0 0 0',
                              display: 'flex',
                              fontSize: '20px'
                            }}
                          >
                            {isDone ? <FiCheckSquare /> : <FiSquare />}
                          </button>

                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: isDone ? 'var(--text-secondary)' : 'var(--text)',
                              textDecoration: isDone ? 'line-through' : 'none',
                              transition: 'color 0.2s ease'
                            }}>
                              {item.titulo}
                            </div>

                            {item.descricao && (
                              <p style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                margin: '4px 0 0 0',
                                textDecoration: isDone ? 'line-through' : 'none'
                              }}>
                                {item.descricao}
                              </p>
                            )}

                            {/* Informações de Conclusão e Observação */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                              {isDone && (
                                <span style={{
                                  fontSize: '11px',
                                  color: '#10b981',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 500
                                }}>
                                  <FiCheckCircle size={12} /> Concluído às {concluidoHorario} {item.concluido_por ? `por ${item.concluido_por}` : ''}
                                </span>
                              )}

                              {item.observacao && (
                                <span style={{
                                  fontSize: '11px',
                                  color: 'var(--primary-light)',
                                  backgroundColor: 'rgba(140, 105, 172, 0.15)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  Nota: {item.observacao}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          {/* Botões Mover Ordem (Subir / Descer) */}
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={itemIdx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStep(item, 'up', items);
                            }}
                            title="Subir posição"
                            style={{ padding: '6px 8px', fontSize: '11px', opacity: itemIdx === 0 ? 0.3 : 1, cursor: itemIdx === 0 ? 'not-allowed' : 'pointer' }}
                          >
                            <FiArrowUp size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={itemIdx === items.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStep(item, 'down', items);
                            }}
                            title="Descer posição"
                            style={{ padding: '6px 8px', fontSize: '11px', opacity: itemIdx === items.length - 1 ? 0.3 : 1, cursor: itemIdx === items.length - 1 ? 'not-allowed' : 'pointer' }}
                          >
                            <FiArrowDown size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setObsModalItem(item);
                              setObsText(item.observacao || '');
                            }}
                            title="Adicionar/Editar Nota do dia"
                            style={{ padding: '6px 8px', fontSize: '11px' }}
                          >
                            <FiEdit3 size={13} />
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(item.template_id, item.titulo);
                            }}
                            title="Remover da rotina diária"
                            style={{ padding: '6px 8px' }}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Rotina */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="login-card" style={{ maxWidth: '500px', width: '100%' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--primary-light)', marginBottom: '8px' }}>
              Nova Tarefa de Rotina Diária
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Esta tarefa aparecerá todos os dias no checklist da clínica.
            </p>

            <form onSubmit={handleCreateTemplate}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Título da Tarefa *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Conferir estoque de gaze e seringas"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Turno / Momento do Dia *</label>
                <select
                  className="form-input"
                  value={newPeriodo}
                  onChange={e => setNewPeriodo(e.target.value)}
                >
                  <option value="manha">🌅 Manhã / Abertura</option>
                  <option value="tarde">☀️ Tarde / Rotina</option>
                  <option value="noite">🌙 Noite / Fechamento</option>
                  <option value="geral">📋 Geral / A qualquer hora</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Descrição / Instruções (Opcional)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={newDescricao}
                  onChange={e => setNewDescricao(e.target.value)}
                  placeholder="Instruções de como executar..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Cadastrar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Observação do Dia */}
      {obsModalItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="login-card" style={{ maxWidth: '450px', width: '100%' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--primary-light)', marginBottom: '8px' }}>
              Adicionar Nota / Observação
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Tarefa: <strong>{obsModalItem.titulo}</strong> ({formatDateDisplay(selectedDate)})
            </p>

            <form onSubmit={handleSaveObservation}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <textarea
                  className="form-input"
                  rows={3}
                  value={obsText}
                  onChange={e => setObsText(e.target.value)}
                  placeholder="Ex: Geladeira marcando 3.5°C, tudo normal..."
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setObsModalItem(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
