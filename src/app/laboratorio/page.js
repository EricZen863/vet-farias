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
  const [activeLab, setActiveLab] = useState(0);
  const [selectedColeta, setSelectedColeta] = useState('');
  const [records, setRecords] = useState([]);
  const [coletaInfo, setColetaInfo] = useState(null);
  const [showExcelExample, setShowExcelExample] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/labs')
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          setLabs(data);
          setActiveLab(data.findIndex(l => l.ativo) >= 0 ? data.findIndex(l => l.ativo) : 0);
        }
      }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || labs.length === 0) return;
    const lab = labs[activeLab];
    if (!lab) return;
    fetch(`/api/records?module=lab&month=${monthKey}&labId=${lab.id}`)
      .then(r => r.json()).then(setRecords).catch(() => {});
  }, [isAuthenticated, monthKey, activeLab, labs]);

  const handleExcelUpload = async (file) => {
    const data = await parseExcelFile(file);
    const lab = labs[activeLab];
    await fetch('/api/labs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'uploadCatalog', id: lab.id, catalogo: data }),
    });
    const updatedLabs = [...labs];
    updatedLabs[activeLab] = { ...updatedLabs[activeLab], catalogo: data };
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
    if (!updatedLabs[activeLab]?.ativo) {
      const nextActive = updatedLabs.findIndex(l => l.ativo);
      if (nextActive >= 0) setActiveLab(nextActive);
    }
  };

  const handleColetaSelect = (val) => {
    setSelectedColeta(val);
    const lab = labs[activeLab];
    if (lab) {
      const found = lab.catalogo.find(c => c.coleta.toLowerCase() === val.toLowerCase());
      setColetaInfo(found || null);
    }
  };

  const addRecord = async () => {
    if (!selectedColeta || !coletaInfo) return;
    const lab = labs[activeLab];
    try {
      const res = await fetch('/api/records', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'lab', month: monthKey, labId: lab.id,
          coleta: coletaInfo.coleta, precoCusto: coletaInfo.precoCusto,
          prazoEntrega: coletaInfo.prazoEntrega, repasse: coletaInfo.repasse, lucro: coletaInfo.lucro,
        }),
      });
      const newRecord = await res.json();
      setRecords([...records, newRecord]);
      setSelectedColeta(''); setColetaInfo(null);
    } catch {}
  };

  const deleteRecord = async (id) => {
    try {
      await fetch(`/api/records?module=lab&id=${id}`, { method: 'DELETE' });
      setRecords(records.filter(r => r.id !== id));
    } catch {}
  };

  const total = records.reduce((sum, r) => sum + (r.precoCusto || 0), 0);
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (loading || !isAuthenticated) return null;

  const currentLab = labs[activeLab];
  const coletaOptions = currentLab?.catalogo?.map(c => c.coleta) || [];

  return (
    <>
      <div className="page-header"><div className="page-header-row"><div><h1 className="page-title">Coletas Laboratoriais</h1><p className="page-subtitle">Gerencie os custos das coletas terceirizadas</p></div><div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><Link href="/laboratorio/relatorios" className="report-link"><FiBarChart2 size={16} /> Relatórios</Link><MonthSelector value={monthKey} onChange={setMonthKey} /></div></div></div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {labs.map((lab, i) => lab.ativo && (
              <button key={i} className={`tab ${activeLab === i ? 'tab-active' : ''}`} onClick={() => setActiveLab(i)}>{lab.nome}</button>
            ))}
          </div>
          <button className="btn-secondary btn-small" onClick={addLab}><FiPlus size={14} /> Adicionar Lab</button>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Nome do Laboratório</label>
            <input type="text" className="form-input" value={currentLab?.nome || ''} onChange={(e) => handleLabNameChange(activeLab, e.target.value)} />
          </div>
          <ExcelUploader onUpload={handleExcelUpload} label="Upload Tabela Excel" />
          {labs.length > 1 && (
            <div className="lab-toggle"><span>Ativo</span><div className={`toggle-switch ${currentLab?.ativo ? 'active' : ''}`} onClick={() => toggleLab(activeLab)} /></div>
          )}
        </div>

        {currentLab?.catalogo?.length > 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>📋 {currentLab.catalogo.length} tipos de coletas carregados</p>
        )}

        <div style={{ marginTop: '16px' }}>
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
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Registrar Coleta</h2>
        <div className="inline-form">
          <div className="form-group"><label className="form-label">Coleta</label><Autocomplete options={coletaOptions} value={selectedColeta} onChange={handleColetaSelect} placeholder="Digite 3 letras para buscar..." /></div>
          {coletaInfo && (<>
            <div className="form-group" style={{ minWidth: '120px' }}><label className="form-label">Preço Custo</label><input type="text" className="form-input" value={formatCurrency(coletaInfo.precoCusto)} readOnly /></div>
            <div className="form-group" style={{ minWidth: '120px' }}><label className="form-label">Prazo</label><input type="text" className="form-input" value={coletaInfo.prazoEntrega} readOnly /></div>
            <div className="form-group" style={{ minWidth: '120px' }}><label className="form-label">Repasse</label><input type="text" className="form-input" value={formatCurrency(coletaInfo.repasse)} readOnly /></div>
            <div className="form-group" style={{ minWidth: '100px' }}><label className="form-label">Lucro</label><input type="text" className="form-input" value={formatCurrency(coletaInfo.lucro)} readOnly /></div>
          </>)}
          <button className="btn-primary" onClick={addRecord} disabled={!coletaInfo}>Adicionar</button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Coletas do Mês</h2>
        {records.length === 0 ? (<div className="no-data">Nenhuma coleta registrada neste mês</div>) : (
          <div className="table-wrapper"><table><thead><tr><th>Data</th><th>Coleta</th><th>Preço Custo</th><th>Prazo</th><th>Repasse</th><th>Lucro</th><th></th></tr></thead>
          <tbody>{records.map((r) => (<tr key={r.id}><td>{new Date(r.data).toLocaleDateString('pt-BR')}</td><td>{r.coleta}</td><td>{formatCurrency(r.precoCusto)}</td><td>{r.prazoEntrega}</td><td>{formatCurrency(r.repasse)}</td><td>{formatCurrency(r.lucro)}</td><td><button className="delete-btn" onClick={() => deleteRecord(r.id)}><FiTrash2 /></button></td></tr>))}</tbody></table></div>
        )}
        <div className="total-bar"><span className="total-label">Total a pagar ao {currentLab?.nome || 'laboratório'}</span><span className="total-value">{formatCurrency(total)}</span></div>
      </div>
    </>
  );
}
