'use client';
import { useState, useEffect } from 'react';
import { FiArrowLeft, FiDownload, FiEdit2 } from 'react-icons/fi';
import { useAuth } from '../../../components/AuthProvider';
import Link from 'next/link';

export default function RelatoriosPontoPage() {
  const { userType } = useAuth();
  const [mesAtual, setMesAtual] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    if (userType === 'admin') {
      loadRegistros();
    }
  }, [userType, mesAtual]);

  const loadRegistros = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ponto?relatorioMes=${mesAtual}`);
      const data = await res.json();
      setRegistros(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord({ ...rec });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        action: 'editar',
        id: editingRecord.id,
        tipo_dia: editingRecord.tipo_dia,
        entrada: editingRecord.entrada,
        saida_almoco: editingRecord.saida_almoco,
        volta_almoco: editingRecord.volta_almoco,
        saida: editingRecord.saida,
        horas_extras: parseFloat(editingRecord.horas_extras) || 0,
        observacao: editingRecord.observacao
      };
      await fetch('/api/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setEditingRecord(null);
      loadRegistros();
    } catch (err) {
      alert('Erro ao salvar edição');
    }
  };

  const handlePrintPDF = (funcName, registrosDoFunc, tipo) => {
    const recordsToPrint = tipo === 'extras' 
      ? registrosDoFunc.filter(r => r.horas_extras > 0 || r.tipo_dia === 'feriado' || r.tipo_dia === 'folga' || r.tipo_dia === 'falta') 
      : registrosDoFunc;

    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Relatório de Ponto - ${funcName}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .extra { color: #d32f2f; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Relatório de Ponto - ${funcName} - ${mesAtual}</h1>
          <p><strong>Tipo de Relatório:</strong> ${tipo === 'todos' ? 'Todos os dias registrados no mês' : 'Apenas Horas Extras, Feriados e Folgas Trabalhadas'}</p>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Entrada</th>
                <th>Saída Almoço</th>
                <th>Volta Almoço</th>
                <th>Saída</th>
                <th>H. Extras</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              ${recordsToPrint.length > 0 ? recordsToPrint.map(r => `
                <tr>
                  <td>${new Date(r.data).toLocaleDateString('pt-BR')}</td>
                  <td style="text-transform: capitalize;">${r.tipo_dia || 'Normal'}</td>
                  <td>${r.entrada ? r.entrada.substring(0,5) : '-'}</td>
                  <td>${r.saida_almoco ? r.saida_almoco.substring(0,5) : '-'}</td>
                  <td>${r.volta_almoco ? r.volta_almoco.substring(0,5) : '-'}</td>
                  <td>${r.saida ? r.saida.substring(0,5) : '-'}</td>
                  <td class="${r.horas_extras > 0 ? 'extra' : ''}">${r.horas_extras}h</td>
                  <td>${r.observacao || ''}</td>
                </tr>
              `).join('') : '<tr><td colspan="8" style="text-align: center;">Nenhum registro encontrado para este filtro.</td></tr>'}
            </tbody>
          </table>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const groupedRegistros = registros.reduce((acc, curr) => {
    if (!acc[curr.funcionario_id]) {
      acc[curr.funcionario_id] = { id: curr.funcionario_id, nome: curr.nome, cpf: curr.cpf, records: [] };
    }
    acc[curr.funcionario_id].records.push(curr);
    return acc;
  }, {});

  const employeeList = Object.values(groupedRegistros).sort((a, b) => a.nome.localeCompare(b.nome));

  // Reload selected employee records when registos change
  useEffect(() => {
    if (selectedEmployee) {
      const updated = employeeList.find(e => e.id === selectedEmployee.id);
      if (updated) setSelectedEmployee(updated);
    }
  }, [registros]);

  if (userType !== 'admin') return <div className="page-container">Acesso Negado</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link href="/folha-de-ponto" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', textDecoration: 'none' }}>
            <FiArrowLeft /> Voltar para Funcionários
          </Link>
          <h1 className="page-title">Relatórios de Ponto</h1>
          <p className="page-description">Visualize os registros do mês e gere exportações em PDF.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="month" 
            className="form-input" 
            value={mesAtual} 
            onChange={(e) => setMesAtual(e.target.value)} 
          />
        </div>
      </div>

      <div className="card-grid">
        {loading ? (
          <p>Carregando...</p>
        ) : employeeList.length === 0 ? (
          <div className="no-data" style={{ gridColumn: '1 / -1' }}>Nenhum registro encontrado para este mês.</div>
        ) : (
          employeeList.map(emp => {
            const totalExtras = emp.records.reduce((sum, r) => sum + (parseFloat(r.horas_extras) || 0), 0);
            return (
              <div key={emp.id} className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setSelectedEmployee(emp)}>
                <h3 style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '8px' }}>{emp.nome}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>CPF: {emp.cpf}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span>Registros: <strong>{emp.records.length}</strong></span>
                  <span style={{ color: totalExtras > 0 ? 'var(--primary-light)' : 'inherit' }}>Extras: <strong>{totalExtras}h</strong></span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <h2>Relatório Mensal - {selectedEmployee.nome}</h2>
              <button className="close-btn" onClick={() => setSelectedEmployee(null)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => handlePrintPDF(selectedEmployee.nome, selectedEmployee.records, 'todos')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiDownload /> Imprimir Todos os Dias
                </button>
                <button className="btn-secondary" onClick={() => handlePrintPDF(selectedEmployee.nome, selectedEmployee.records, 'extras')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiDownload /> Imprimir Apenas Extras/Feriados
                </button>
              </div>

              <div className="table-responsive">
                <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Entrada</th>
                      <th>Saída Alm.</th>
                      <th>Volta Alm.</th>
                      <th>Saída</th>
                      <th>H. Extras</th>
                      <th>Obs</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEmployee.records.sort((a, b) => new Date(a.data) - new Date(b.data)).map(r => (
                      <tr key={r.id}>
                        <td>{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.tipo_dia || 'Normal'}</td>
                        <td>{r.entrada ? r.entrada.substring(0,5) : '-'}</td>
                        <td>{r.saida_almoco ? r.saida_almoco.substring(0,5) : '-'}</td>
                        <td>{r.volta_almoco ? r.volta_almoco.substring(0,5) : '-'}</td>
                        <td>{r.saida ? r.saida.substring(0,5) : '-'}</td>
                        <td><strong style={{ color: r.horas_extras > 0 ? 'var(--primary)' : 'inherit' }}>{r.horas_extras}h</strong></td>
                        <td style={{ maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.observacao}>{r.observacao}</td>
                        <td>
                          <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); handleOpenEdit(r); }} title="Editar">
                            <FiEdit2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Editar Ponto - {new Date(editingRecord.data).toLocaleDateString('pt-BR')}</h2>
              <button className="close-btn" onClick={() => setEditingRecord(null)}>&times;</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <strong>Funcionário:</strong> {editingRecord.nome}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Tipo de Dia</label>
                  <select className="form-input" value={editingRecord.tipo_dia} onChange={e => setEditingRecord({...editingRecord, tipo_dia: e.target.value})}>
                    <option value="normal">Dia Normal</option>
                    <option value="feriado">Feriado</option>
                    <option value="folga">Folga Trabalhada</option>
                    <option value="falta">Falta</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Entrada</label>
                    <input type="time" className="form-input" value={editingRecord.entrada || ''} onChange={e => setEditingRecord({...editingRecord, entrada: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Saída Almoço</label>
                    <input type="time" className="form-input" value={editingRecord.saida_almoco || ''} onChange={e => setEditingRecord({...editingRecord, saida_almoco: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Volta Almoço</label>
                    <input type="time" className="form-input" value={editingRecord.volta_almoco || ''} onChange={e => setEditingRecord({...editingRecord, volta_almoco: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Saída</label>
                    <input type="time" className="form-input" value={editingRecord.saida || ''} onChange={e => setEditingRecord({...editingRecord, saida: e.target.value})} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Horas Extras</label>
                  <input type="number" step="0.01" className="form-input" value={editingRecord.horas_extras || 0} onChange={e => setEditingRecord({...editingRecord, horas_extras: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Observação</label>
                  <input type="text" className="form-input" value={editingRecord.observacao || ''} onChange={e => setEditingRecord({...editingRecord, observacao: e.target.value})} placeholder="Ex: Esqueceu de bater o ponto..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingRecord(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
