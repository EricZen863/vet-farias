'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import MonthSelector from '../../components/MonthSelector';
import Autocomplete from '../../components/Autocomplete';
import ExcelUploader from '../../components/ExcelUploader';
import { parseExcelFile } from '../../lib/excelParser';
import { saveData, loadData, getMonthKey } from '../../lib/storage';
import Link from 'next/link';
import { FiTrash2, FiBarChart2, FiPlus } from 'react-icons/fi';

export default function LaboratorioPage() {
  const { isAuthenticated, loading } = useAuth();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [labs, setLabs] = useState([]);
  const [currentLabIndex, setCurrentLabIndex] = useState(0);
  const [records, setRecords] = useState([]);
  const [selectedColeta, setSelectedColeta] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    const savedLabs = loadData('lab', 'labs', [{ id: 1, nome: 'Laboratório 1', active: true, catalog: [] }]);
    setLabs(savedLabs);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || labs.length === 0) return;
    const currentLab = labs[currentLabIndex];
    if (currentLab) {
      setRecords(loadData('lab', `records_${currentLab.id}_${monthKey}`, []));
    }
  }, [isAuthenticated, monthKey, currentLabIndex, labs]);

  const currentLab = labs[currentLabIndex];
  const catalogOptions = currentLab?.catalog?.map(c => c.coleta) || [];

  const handleUpload = async (file) => {
    const data = await parseExcelFile(file);
    const updatedLabs = [...labs];
    updatedLabs[currentLabIndex] = { ...updatedLabs[currentLabIndex], catalog: data };
    setLabs(updatedLabs);
    saveData('lab', 'labs', updatedLabs);
    return data;
  };

  const updateLabName = (name) => {
    const updatedLabs = [...labs];
    updatedLabs[currentLabIndex] = { ...updatedLabs[currentLabIndex], nome: name };
    setLabs(updatedLabs);
    saveData('lab', 'labs', updatedLabs);
  };

  const addLab = () => {
    const newId = Math.max(...labs.map(l => l.id), 0) + 1;
    const updatedLabs = [...labs, { id: newId, nome: `Laboratório ${newId}`, active: true, catalog: [] }];
    setLabs(updatedLabs);
    saveData('lab', 'labs', updatedLabs);
    setCurrentLabIndex(updatedLabs.length - 1);
  };

  const addColeta = () => {
    if (!selectedColeta || !currentLab) return;
    const catalogItem = currentLab.catalog.find(c => c.coleta.toLowerCase() === selectedColeta.toLowerCase());
    if (!catalogItem) return;
    const newRecord = { id: Date.now(), data: new Date().toISOString(), ...catalogItem };
    const updated = [...records, newRecord];
    setRecords(updated);
    saveData('lab', `records_${currentLab.id}_${monthKey}`, updated);
    setSelectedColeta('');
  };

  const deleteRecord = (id) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    saveData('lab', `records_${currentLab.id}_${monthKey}`, updated);
  };

  const total = records.reduce((sum, r) => sum + (r.precoCusto || 0), 0);
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading || !isAuthenticated) return null;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Coletas Laboratoriais</h1>
            <p className="page-subtitle">Gerencie os custos das coletas terceirizadas</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/laboratorio/relatorios" className="report-link">
              <FiBarChart2 size={16} /> Relatórios
            </Link>
            <MonthSelector value={monthKey} onChange={setMonthKey} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="tabs">
            {labs.map((lab, i) => (
              <button key={lab.id} className={`tab ${i === currentLabIndex ? 'tab-active' : ''}`} onClick={() => setCurrentLabIndex(i)}>
                {lab.nome}
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={addLab}><FiPlus size={14} /> Adicionar Lab</button>
        </div>

        {currentLab && (
          <>
            <div className="form-row" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Nome do Laboratório</label>
                <input type="text" className="form-input" value={currentLab.nome} onChange={(e) => updateLabName(e.target.value)} />
              </div>
              <div className="form-group" style={{ alignSelf: 'end' }}>
                <ExcelUploader onUpload={handleUpload} label="Upload Tabela Excel" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Registrar Coleta</h2>
        <div className="inline-form">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Coleta</label>
            <Autocomplete options={catalogOptions} value={selectedColeta} onChange={setSelectedColeta} placeholder="Digite 3 letras para buscar..." />
          </div>
          <button className="btn-primary" onClick={addColeta}>Adicionar</button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Coletas do Mês</h2>
        {records.length === 0 ? (
          <div className="no-data">Nenhuma coleta registrada neste mês</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Data</th><th>Coleta</th><th>Custo</th><th>Repasse</th><th>Lucro</th><th></th></tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                    <td>{r.coleta}</td>
                    <td>{formatCurrency(r.precoCusto || 0)}</td>
                    <td>{formatCurrency(r.repasse || 0)}</td>
                    <td>{formatCurrency(r.lucro || 0)}</td>
                    <td><button className="delete-btn" onClick={() => deleteRecord(r.id)}><FiTrash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="total-bar">
          <span className="total-label">Total a pagar ao {currentLab?.nome || 'laboratório'}</span>
          <span className="total-value">{formatCurrency(total)}</span>
        </div>
      </div>
    </>
  );
}
