'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import Autocomplete from '../../components/Autocomplete';
import ExcelUploader from '../../components/ExcelUploader';
import { getMonthKey } from '../../lib/storage';
import { parseExcelFile, exportCatalogToExcel } from '../../lib/excelParser';
import Link from 'next/link';
import { FiTrash2, FiBarChart2, FiPlus, FiInfo, FiRepeat, FiDownload } from 'react-icons/fi';

export default function LaboratorioPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [labs, setLabs] = useState([]);
  const [records, setRecords] = useState({});
  const [forms, setForms] = useState({});
  const [tipos, setTipos] = useState({});
  const [coletaInfos, setColetaInfos] = useState({});
  const [viewTabs, setViewTabs] = useState({});
  const [showExcelExample, setShowExcelExample] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/labs')
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) setLabs(data);
      }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || labs.length === 0) return;
    labs.filter(l => l.ativo).forEach(lab => {
      fetch(`/api/records?module=lab&month=${monthKey}&labId=${lab.id}`)
        .then(r => r.json())
        .then(data => setRecords(prev => ({ ...prev, [lab.id]: data })))
        .catch(() => {});
    });
  }, [isAuthenticated, monthKey, labs]);

  const getForm = (id) => forms[id] || '';
  const getTipo = (id) => tipos[id] || 'normal';

  const setFormValue = (id, value) => {
    setForms(prev => ({ ...prev, [id]: value }));
    const lab = labs.find(l => l.id === id);
    if (lab) {
      const found = lab.catalogo?.find(c => c.coleta.toLowerCase() === value.toLowerCase());
      setColetaInfos(prev => ({ ...prev, [id]: found || null }));
    }
  };

  const setTipoValue = (id, value) => {
    setTipos(prev => ({ ...prev, [id]: value }));
  };

  const setViewTab = (id, tab) => {
    setViewTabs(prev => ({ ...prev, [id]: tab }));
  };

  const handleExcelUpload = async (file, labId) => {
    const data = await parseExcelFile(file);
    const labIndex = labs.findIndex(l => l.id === labId);
    await fetch('/api/labs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'uploadCatalog', id: labId, catalogo: data }),
    });
    const updatedLabs = [...labs];
    updatedLabs[labIndex] = { ...updatedLabs[labIndex], catalogo: data };
    setLabs(updatedLabs);
    return data;
  };

  const handleLabNameChange = async (index, name) => {
    const updatedLabs = [...labs];
    updatedLabs[index] = { ...updatedLabs[index], nome: name };
    setLabs(updatedLabs);
    await fetch('/api/labs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateName', id: updatedLabs[index].id, nome: name }),
    });
  };

  const addLab = async () => {
    try {
      const res = await fetch('/api/labs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', nome: `Laboratório ${labs.length + 1}` }),
      });
      const newLab = await res.json();
      setLabs([...labs, { ...newLab, catalogo: [] }]);
    } catch {}
  };

  const toggleLab = async (index) => {
    const lab = labs[index];
    await fetch('/api/labs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id: lab.id }),
    });
    const updatedLabs = [...labs];
    updatedLabs[index] = { ...updatedLabs[index], ativo: !updatedLabs[index].ativo };
    setLabs(updatedLabs);
  };

  const addRecord = async (labId) => {
    const info = coletaInfos[labId];
    if (!info) return;
    const tipo = getTipo(labId);

    try {
      const res = await fetch('/api/records', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'lab', month: monthKey, labId,
          coleta: info.coleta, precoCusto: info.precoCusto,
          prazoEntrega: info.prazoEntrega, repasse: info.repasse, lucro: info.lucro,
          tipo
        }),
      });
      const newRecord = await res.json();
      setRecords(prev => ({ ...prev, [labId]: [...(prev[labId] || []), newRecord] }));
      setForms(prev => ({ ...prev, [labId]: '' }));
      setColetaInfos(prev => ({ ...prev, [labId]: null }));
    } catch {}
  };

  const deleteRecord = async (labId, id) => {
    try {
      await fetch(`/api/records?module=lab&id=${id}`, { method: 'DELETE' });
      setRecords(prev => ({ ...prev, [labId]: (prev[labId] || []).filter(r => r.id !== id) }));
    } catch {}
  };

  const toggleRecordTipo = async (labId, record) => {
    const newTipo = record.tipo === 'plano' ? 'normal' : 'plano';
    try {
      await fetch('/api/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'lab', id: record.id, tipo: newTipo }),
      });
      setRecords(prev => ({
        ...prev,
        [labId]: (prev[labId] || []).map(r => (r.id === record.id ? { ...r, tipo: newTipo } : r))
      }));
    } catch {}
  };

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  const activeLabs = labs.filter(l => l.ativo);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Coletas Laboratoriais</h1>
            <p className="page-subtitle">Gerencie os custos e confira os pedidos da clínica e de planos de saúde</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-secondary btn-small" onClick={addLab}><FiPlus size={14} /> Adicionar Lab</button>
            <Link href="/laboratorio/relatorios" className="report-link"><FiBarChart2 size={16} /> Relatórios</Link>
            <MonthSelector value={monthKey} onChange={setMonthKey} />
          </div>
        </div>
      </div>

      {/* Excel example info */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <button onClick={() => setShowExcelExample(!showExcelExample)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', padding: '4px 0' }}>
          <FiInfo size={14} />
          {showExcelExample ? 'Ocultar exemplo da tabela Excel' : 'Ver exemplo de como organizar a tabela Excel'}
        </button>
        {showExcelExample && (
          <div style={{ marginTop: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px', fontSize: '13px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>A planilha Excel deve ter as seguintes colunas na <strong>primeira linha</strong> (cabeçalho):</p>
            <div className="table-wrapper" style={{ marginTop: '0' }}>
              <table><thead><tr><th>Coleta</th><th>Preço de Custo</th><th>Prazo de Entrega</th><th>Repasse</th><th>Lucro</th></tr></thead>
              <tbody><tr><td>Hemograma Completo</td><td>15,00</td><td>2 dias</td><td>45,00</td><td>30,00</td></tr><tr><td>Bioquímico Renal</td><td>25,00</td><td>3 dias</td><td>70,00</td><td>45,00</td></tr><tr><td>Urinálise</td><td>12,00</td><td>1 dia</td><td>35,00</td><td>23,00</td></tr></tbody></table>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '10px' }}>💡 Os nomes das colunas não precisam ser exatamente iguais. O sistema reconhece variações como &quot;Custo&quot;, &quot;Preço&quot;, &quot;Nome&quot;, etc.</p>
          </div>
        )}
      </div>

      {/* Lab Grid */}
      <div className="maquineta-grid">
        {activeLabs.map((lab) => {
          const labRecords = records[lab.id] || [];
          const normalRecords = labRecords.filter(r => r.tipo !== 'plano');
          const planoRecords = labRecords.filter(r => r.tipo === 'plano');
          const totalNormal = normalRecords.reduce((sum, r) => sum + (r.precoCusto || 0), 0);
          const totalPlanoTabela = planoRecords.reduce((sum, r) => sum + (r.precoCusto || 0), 0);

          const coletaOptions = lab.catalogo?.map(c => c.coleta) || [];
          const info = coletaInfos[lab.id] || null;
          const labIndex = labs.findIndex(l => l.id === lab.id);
          const currentTipo = getTipo(lab.id);
          const currentTab = viewTabs[lab.id] || 'todos';

          return (
            <div className="maquineta-card" key={lab.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="maquineta-header">
                <div style={{ flex: 1 }}>
                  <input
                    type="text" className="form-input" value={lab.nome}
                    onChange={(e) => handleLabNameChange(labIndex, e.target.value)}
                    style={{ fontWeight: 600, fontSize: '16px', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)', borderRadius: 0, padding: '4px 0', width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {labs.length > 1 && (
                    <div className="lab-toggle"><span style={{ fontSize: '12px' }}>Ativo</span><div className={`toggle-switch ${lab.ativo ? 'active' : ''}`} onClick={() => toggleLab(labIndex)} /></div>
                  )}
                </div>
              </div>

              <div className="maquineta-body" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <ExcelUploader onUpload={(file) => handleExcelUpload(file, lab.id)} label="Upload Tabela" />
                  {lab.catalogo?.length > 0 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => exportCatalogToExcel(lab.catalogo, lab.nome)}
                      title="Baixar planilha Excel com todos os exames cadastrados deste laboratório"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <FiDownload size={14} /> Baixar Tabela Excel ({lab.catalogo.length} exames)
                    </button>
                  )}
                  {lab.catalogo?.length > 0 && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: 'auto' }}>
                      📋 {lab.catalogo.length} coletas no catálogo
                    </span>
                  )}
                </div>

                {/* Formulário com seleção de Normal vs Plano */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2, minWidth: '150px' }}>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px', display: 'block' }}>Exame / Coleta</label>
                    <Autocomplete options={coletaOptions} value={getForm(lab.id)} onChange={(val) => setFormValue(lab.id, val)} placeholder="Buscar coleta..." />
                  </div>
                  <div style={{ minWidth: '140px', flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px', display: 'block' }}>Tipo do Pedido</label>
                    <select
                      className="form-input"
                      value={currentTipo}
                      onChange={(e) => setTipoValue(lab.id, e.target.value)}
                      style={{ width: '100%', padding: '9px 10px', fontSize: '13px' }}
                    >
                      <option value="normal">🏥 Normal (Clínica)</option>
                      <option value="plano">🐾 Plano de Saúde</option>
                    </select>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => addRecord(lab.id)}
                    disabled={!info}
                    style={{ padding: '9px 18px', fontSize: '14px', height: '38px' }}
                    title="Adicionar Coleta"
                  >
                    +
                  </button>
                </div>

                {/* Info do exame selecionado */}
                {info && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px' }}>
                    {currentTipo === 'normal' ? (
                      <>
                        <span style={{ background: 'var(--primary-bg)', color: 'var(--primary-light)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          Custo a Pagar: <strong>{formatCurrency(info.precoCusto)}</strong>
                        </span>
                        <span style={{ background: 'var(--primary-bg)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          Prazo: {info.prazoEntrega}
                        </span>
                        <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '4px 10px', borderRadius: '4px' }}>
                          Lucro: {formatCurrency(info.lucro)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                          🐾 <strong>Plano de Saúde:</strong> Não tem custo para a clínica
                        </span>
                        <span style={{ background: 'var(--primary-bg)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          Prazo: {info.prazoEntrega}
                        </span>
                        <span style={{ opacity: 0.6, fontSize: '11px', alignSelf: 'center' }}>
                          (Tabela ref: {formatCurrency(info.precoCusto)})
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Abas de Visualização (Lado a Lado / Normais / Planos) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setViewTab(lab.id, 'todos')}
                      style={{
                        border: 'none', background: currentTab === 'todos' ? 'var(--primary)' : 'transparent',
                        color: currentTab === 'todos' ? '#fff' : 'var(--text-secondary)',
                        padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 500
                      }}
                    >
                      Lado a Lado ({labRecords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewTab(lab.id, 'normal')}
                      style={{
                        border: 'none', background: currentTab === 'normal' ? 'var(--primary)' : 'transparent',
                        color: currentTab === 'normal' ? '#fff' : 'var(--text-secondary)',
                        padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 500
                      }}
                    >
                      🏥 Normais ({normalRecords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewTab(lab.id, 'plano')}
                      style={{
                        border: 'none', background: currentTab === 'plano' ? '#0284c7' : 'transparent',
                        color: currentTab === 'plano' ? '#fff' : 'var(--text-secondary)',
                        padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 500
                      }}
                    >
                      🐾 Planos ({planoRecords.length})
                    </button>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    💡 Dica: clique no badge para trocar entre Normal/Plano
                  </span>
                </div>

                {labRecords.length === 0 ? (
                  <div className="no-data" style={{ padding: '24px', fontSize: '13px' }}>Nenhuma coleta registrada neste mês</div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: currentTab === 'todos' ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
                    gap: '14px'
                  }}>
                    {/* COLUNA 1: PEDIDOS NORMAIS (CLÍNICA PAGA) */}
                    {(currentTab === 'todos' || currentTab === 'normal') && (
                      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                            🏥 Pedidos Normais ({normalRecords.length})
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-light)' }}>
                            Subtotal: {formatCurrency(totalNormal)}
                          </span>
                        </div>

                        {normalRecords.length === 0 ? (
                          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                            Nenhum pedido normal
                          </div>
                        ) : (
                          <div className="table-wrapper" style={{ marginTop: 0, maxHeight: '220px', overflowY: 'auto' }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Coleta</th>
                                  <th>Custo</th>
                                  <th style={{ textAlign: 'center' }}>Tipo</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {normalRecords.map((r) => (
                                  <tr key={r.id}>
                                    <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                                    <td style={{ fontSize: '12px' }}>{r.coleta}</td>
                                    <td style={{ fontSize: '12px', fontWeight: 600 }}>{formatCurrency(r.precoCusto)}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => toggleRecordTipo(lab.id, r)}
                                        style={{
                                          border: 'none', background: 'rgba(140, 105, 172, 0.15)', color: 'var(--primary-light)',
                                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
                                          display: 'inline-flex', alignItems: 'center', gap: '3px'
                                        }}
                                        title="Clique para mudar para Plano de Saúde"
                                      >
                                        Normal <FiRepeat size={10} />
                                      </button>
                                    </td>
                                    <td>
                                      <button className="delete-btn" onClick={() => deleteRecord(lab.id, r.id)} title="Excluir">
                                        <FiTrash2 size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* COLUNA 2: PEDIDOS DE PLANO DE SAÚDE (SEM CUSTO DA CLÍNICA) */}
                    {(currentTab === 'todos' || currentTab === 'plano') && (
                      <div style={{ background: 'var(--bg-input)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                            🐾 Planos de Saúde ({planoRecords.length})
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                            Sem custo p/ clínica
                          </span>
                        </div>

                        {planoRecords.length === 0 ? (
                          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                            Nenhum pedido de plano registrado
                          </div>
                        ) : (
                          <div className="table-wrapper" style={{ marginTop: 0, maxHeight: '220px', overflowY: 'auto' }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Coleta</th>
                                  <th>Ref. Tabela</th>
                                  <th style={{ textAlign: 'center' }}>Tipo</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {planoRecords.map((r) => (
                                  <tr key={r.id}>
                                    <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                                    <td style={{ fontSize: '12px' }}>{r.coleta}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      <span style={{ textDecoration: 'line-through' }}>{formatCurrency(r.precoCusto)}</span>{' '}
                                      <strong style={{ color: '#38bdf8', fontSize: '11px' }}>R$ 0,00</strong>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => toggleRecordTipo(lab.id, r)}
                                        style={{
                                          border: 'none', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8',
                                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600,
                                          display: 'inline-flex', alignItems: 'center', gap: '3px'
                                        }}
                                        title="Clique para mudar para Normal"
                                      >
                                        Plano <FiRepeat size={10} />
                                      </button>
                                    </td>
                                    <td>
                                      <button className="delete-btn" onClick={() => deleteRecord(lab.id, r.id)} title="Excluir">
                                        <FiTrash2 size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {planoRecords.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                            Valor de tabela dos planos: {formatCurrency(totalPlanoTabela)} (isento de pagamento)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rodapé com Total a Pagar e Resumo para Conferência com a Fatura */}
              <div className="maquineta-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                      Total a pagar ao laboratório
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Conferência: <strong>{normalRecords.length}</strong> normais (R$ a pagar) + <strong>{planoRecords.length}</strong> plano (isento) = <strong>{labRecords.length}</strong> pedidos totais
                    </span>
                  </div>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary-light)' }}>
                    {formatCurrency(totalNormal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}