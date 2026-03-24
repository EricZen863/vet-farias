'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import Autocomplete from '../../components/Autocomplete';
import ExcelUploader from '../../components/ExcelUploader';
import { getMonthKey } from '../../lib/storage';
import { parseExcelFile } from '../../lib/excelParser';
import Link from 'next/link';
import { FiTrash2, FiBarChart2, FiPlus, FiInfo } from 'react-icons/fi';

export default function LaboratorioPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [labs, setLabs] = useState([]);
  const [records, setRecords] = useState({});
  const [forms, setForms] = useState({});
  const [coletaInfos, setColetaInfos] = useState({});
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
  const setFormValue = (id, value) => {
    setForms(prev => ({ ...prev, [id]: value }));
    const lab = labs.find(l => l.id === id);
    if (lab) {
      const found = lab.catalogo?.find(c => c.coleta.toLowerCase() === value.toLowerCase());
      setColetaInfos(prev => ({ ...prev, [id]: found || null }));
    }
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
    try {
      const res = await fetch('/api/records', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'lab', month: monthKey, labId,
          coleta: info.coleta, precoCusto: info.precoCusto,
          prazoEntrega: info.prazoEntrega, repasse: info.repasse, lucro: info.lucro,
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

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  const activeLabs = labs.filter(l => l.ativo);

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Coletas Laboratoriais</h1>
            <p className="page-subtitle">Gerencie os custos das coletas terceirizadas</p>
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
        {activeLabs.map((lab, idx) => {
          const labRecords = records[lab.id] || [];
          const total = labRecords.reduce((sum, r) => sum + (r.precoCusto || 0), 0);
          const coletaOptions = lab.catalogo?.map(c => c.coleta) || [];
          const info = coletaInfos[lab.id] || null;
          const labIndex = labs.findIndex(l => l.id === lab.id);

          return (
            <div className="maquineta-card" key={lab.id}>
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

              <div className="maquineta-body">
                <div style={{ marginBottom: '16px' }}>
                  <ExcelUploader onUpload={(file) => handleExcelUpload(file, lab.id)} label="Upload Tabela" />
                  {lab.catalogo?.length > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>📋 {lab.catalogo.length} coletas carregadas</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'end' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <Autocomplete options={coletaOptions} value={getForm(lab.id)} onChange={(val) => setFormValue(lab.id, val)} placeholder="Buscar coleta..." />
                  </div>
                  <button className="btn-primary" onClick={() => addRecord(lab.id)} disabled={!info} style={{ padding: '8px 16px', fontSize: '13px' }}>+</button>
                </div>

                {info && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '12px' }}>
                    <span style={{ background: 'var(--primary-bg)', padding: '4px 10px', borderRadius: '4px' }}>Custo: {formatCurrency(info.precoCusto)}</span>
                    <span style={{ background: 'var(--primary-bg)', padding: '4px 10px', borderRadius: '4px' }}>Prazo: {info.prazoEntrega}</span>
                    <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '4px 10px', borderRadius: '4px' }}>Lucro: {formatCurrency(info.lucro)}</span>
                  </div>
                )}

                {labRecords.length === 0 ? (
                  <div className="no-data" style={{ padding: '20px', fontSize: '13px' }}>Nenhuma coleta registrada</div>
                ) : (
                  <div className="table-wrapper" style={{ marginTop: 0, maxHeight: '200px', overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>Data</th><th>Coleta</th><th>Custo</th><th></th></tr></thead>
                      <tbody>{labRecords.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontSize: '12px' }}>{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                          <td style={{ fontSize: '12px' }}>{r.coleta}</td>
                          <td style={{ fontSize: '12px' }}>{formatCurrency(r.precoCusto)}</td>
                          <td><button className="delete-btn" onClick={() => deleteRecord(lab.id, r.id)}><FiTrash2 size={12} /></button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="maquineta-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total a pagar</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-light)' }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
