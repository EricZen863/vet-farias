'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import Autocomplete from '../../components/Autocomplete';
import ExcelUploader from '../../components/ExcelUploader';
import { saveData, loadData, getMonthKey } from '../../lib/storage';
import { parseExcelFile } from '../../lib/excelParser';
import Link from 'next/link';
import { FiTrash2, FiBarChart2, FiPlus, FiMinus, FiInfo } from 'react-icons/fi';

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
    const savedLabs = loadData('lab', 'labs', [
      { id: 0, nome: 'Laborat\u00f3rio 1', ativo: true, catalogo: [] }
    ]);
    setLabs(savedLabs);
    setActiveLab(savedLabs.findIndex(l => l.ativo) >= 0 ? savedLabs.findIndex(l => l.ativo) : 0);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || labs.length === 0) return;
    const lab = labs[activeLab];
    if (!lab) return;
    const savedRecords = loadData('lab', `records_${lab.id}_${monthKey}`, []);
    setRecords(savedRecords);
  }, [isAuthenticated, monthKey, activeLab, labs]);

  const handleExcelUpload = async (file) => {
    const data = await parseExcelFile(file);
    const updatedLabs = [...labs];
    updatedLabs[activeLab] = { ...updatedLabs[activeLab], catalogo: data };
    setLabs(updatedLabs);
    saveData('lab', 'labs', updatedLabs);
    return data;
  };

  const handleLabNameChange = (index, name) => {
    const updatedLabs = [...labs];
    updatedLabs[index] = { ...updatedLabs[index], nome: name };
    setLabs(updatedLabs);
    saveData('lab', 'labs', updatedLabs);
  };

  const addLab = () => {
    const updatedLabs = [...labs, { id: labs.length, nome: `Laborat\u00f3rio ${labs.length + 1}`, ativo: true, catalogo: [] }];
    setLabs(updatedLabs);
    saveData('lab', 'labs', updatedLabs);
  };

  const toggleLab = (index) => {
    const updatedLabs = [...labs];
    updatedLabs[index] = { ...updatedLabs[index], ativo: !updatedLabs[index].ativo };
    setLabs(updatedLabs);
    saveData('lab', 'labs', updatedLabs);
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

  const addRecord = () => {
    if (!selectedColeta || !coletaInfo) return;
    const lab = labs[activeLab];
    const newRecord = {
      id: Date.now(), data: new Date().toISOString(),
      coleta: coletaInfo.coleta, precoCusto: coletaInfo.precoCusto,
      prazoEntrega: coletaInfo.prazoEntrega, repasse: coletaInfo.repasse, lucro: coletaInfo.lucro,
    };
    const updatedRecords = [...records, newRecord];
    setRecords(updatedRecords);
    saveData('lab', `records_${lab.id}_${monthKey}`, updatedRecords);
    const allLabRecords = loadData('lab', `records_${monthKey}`, []);
    allLabRecords.push(newRecord);
    saveData('lab', `records_${monthKey}`, allLabRecords);
    setSelectedColeta(''); setColetaInfo(null);
  };

  const deleteRecord = (id) => {
    const lab = labs[activeLab];
    const updatedRecords = records.filter(r => r.id !== id);
    setRecords(updatedRecords);
    saveData('lab', `records_${lab.id}_${monthKey}`, updatedRecords);
    const allLabRecords = loadData('lab', `records_${monthKey}`, []);
    const updated = allLabRecords.filter(r => r.id !== id);
    saveData('lab', `records_${monthKey}`, updated);
  };

  const total = records.reduce((sum, r) => sum + (r.precoCusto || 0), 0);
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading || !isAuthenticated) return null;

  const currentLab = labs[activeLab];
  const coletaOptions = currentLab?.catalogo?.map(c => c.coleta) || [];

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Coletas Laboratoriais</h1>
            <p className="page-subtitle">Gerencie os custos das coletas terceirizadas</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/laboratorio/relatorios" className="report-link"><FiBarChart2 size={16} /> Relat\u00f3rios</Link>
            <MonthSelector value={monthKey} onChange={setMonthKey} />
          </div>
        </div>
      </div>

      {/* Lab Tabs */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {labs.map((lab, i) => lab.ativo && (
              <button key={i} className={`tab ${activeLab === i ? 'tab-active' : ''}`} onClick={() => setActiveLab(i)}>{lab.nome}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary btn-small" onClick={addLab}><FiPlus size={14} /> Adicionar Lab</button>
          </div>
        </div>

        {/* Lab Settings */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Nome do Laborat\u00f3rio</label>
            <input type="text" className="form-input" value={currentLab?.nome || ''} onChange={(e) => handleLabNameChange(activeLab, e.target.value)} />
          </div>
          <ExcelUploader onUpload={handleExcelUpload} label="Upload Tabela Excel" />
          {labs.length > 1 && (
            <div className="lab-toggle">
              <span>Ativo</span>
              <div className={`toggle-switch ${currentLab?.ativo ? 'active' : ''}`} onClick={() => toggleLab(activeLab)} />
            </div>
          )}
        </div>

        {currentLab?.catalogo?.length > 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>
            \ud83d\udccb {currentLab.catalogo.length} tipos de coletas carregados
          </p>
        )}

        {/* Excel Example */}
        <div style={{ marginTop: '16px' }}>
          <button onClick={() => setShowExcelExample(!showExcelExample)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', padding: '4px 0' }}>
            <FiInfo size={14} />
            {showExcelExample ? 'Ocultar exemplo da tabela Excel' : 'Ver exemplo de como organizar a tabela Excel'}
          </button>
          {showExcelExample && (
            <div style={{ marginTop: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px', fontSize: '13px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>A planilha Excel deve ter as seguintes colunas na <strong>primeira linha</strong> (cabe\u00e7alho):</p>
              <div className="table-wrapper" style={{ marginTop: '0' }}>
                <table>
                  <thead><tr><th>Coleta</th><th>Pre\u00e7o de Custo</th><th>Prazo de Entrega</th><th>Repasse</th><th>Lucro</th></tr></thead>
                  <tbody>
                    <tr><td>Hemograma Completo</td><td>15,00</td><td>2 dias</td><td>45,00</td><td>30,00</td></tr>
                    <tr><td>Bioqu\u00edmico Renal</td><td>25,00</td><td>3 dias</td><td>70,00</td><td>45,00</td></tr>
                    <tr><td>Urin\u00e1lise</td><td>12,00</td><td>1 dia</td><td>35,00</td><td>23,00</td></tr>
                  </tbody>
                </table>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '10px' }}>\ud83d\udca1 Os nomes das colunas n\u00e3o precisam ser exatamente iguais. O sistema reconhece varia\u00e7\u00f5es como &quot;Custo&quot;, &quot;Pre\u00e7o&quot;, &quot;Nome&quot;, etc.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Record Form */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Registrar Coleta</h2>
        <div className="inline-form">
          <div className="form-group">
            <label className="form-label">Coleta</label>
            <Autocomplete options={coletaOptions} value={selectedColeta} onChange={handleColetaSelect} placeholder="Digite 3 letras para buscar..." />
          </div>
          {coletaInfo && (
            <>
              <div className="form-group" style={{ minWidth: '120px' }}>
                <label className="form-label">Pre\u00e7o Custo</label>
                <input type="text" className="form-input" value={formatCurrency(coletaInfo.precoCusto)} readOnly />
              </div>
              <div className="form-group" style={{ minWidth: '120px' }}>
                <label className="form-label">Prazo</label>
                <input type="text" className="form-input" value={coletaInfo.prazoEntrega} readOnly />
              </div>
              <div className="form-group" style={{ minWidth: '120px' }}>
                <label className="form-label">Repasse</label>
                <input type="text" className="form-input" value={formatCurrency(coletaInfo.repasse)} readOnly />
              </div>
              <div className="form-group" style={{ minWidth: '100px' }}>
                <label className="form-label">Lucro</label>
                <input type="text" className="form-input" value={formatCurrency(coletaInfo.lucro)} readOnly />
              </div>
            </>
          )}
          <button className="btn-primary" onClick={addRecord} disabled={!coletaInfo}>Adicionar</button>
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <h2 className="card-title">Coletas do M\u00eas</h2>
        {records.length === 0 ? (
          <div className="no-data">Nenhuma coleta registrada neste m\u00eas</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Data</th><th>Coleta</th><th>Pre\u00e7o Custo</th><th>Prazo</th><th>Repasse</th><th>Lucro</th><th></th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                    <td>{r.coleta}</td>
                    <td>{formatCurrency(r.precoCusto)}</td>
                    <td>{r.prazoEntrega}</td>
                    <td>{formatCurrency(r.repasse)}</td>
                    <td>{formatCurrency(r.lucro)}</td>
                    <td><button className="delete-btn" onClick={() => deleteRecord(r.id)} title="Excluir"><FiTrash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="total-bar">
          <span className="total-label">Total a pagar ao {currentLab?.nome || 'laborat\u00f3rio'}</span>
          <span className="total-value">{formatCurrency(total)}</span>
        </div>
      </div>
    </>
  );
}
