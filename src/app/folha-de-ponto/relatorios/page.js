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

  const handleExportCSV = () => {
    const headers = ['Funcionario', 'CPF', 'Data', 'Tipo', 'Entrada', 'Saida Almoco', 'Volta Almoco', 'Saida', 'Horas Extras', 'Obs'];
    const rows = registros.map(r => [
      r.nome, r.cpf, new Date(r.data).toLocaleDateString('pt-BR'), r.tipo_dia,
      r.entrada || '-', r.saida_almoco || '-', r.volta_almoco || '-', r.saida || '-',
      r.horas_extras, r.observacao || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ponto_${mesAtual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (userType !== 'admin') return <div className="page-container">Acesso Negado</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link href="/folha-de-ponto" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', textDecoration: 'none' }}>
            <FiArrowLeft /> Voltar para Funcionários
          </Link>
          <h1 className="page-title">Relatórios de Ponto</h1>
          <p className="page-description">Visualize os registros do mês e gere exportações.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="month" 
            className="form-input" 
            value={mesAtual} 
            onChange={(e) => setMesAtual(e.target.value)} 
          />
          <button className="btn-primary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiDownload /> Exportar Excel/CSV
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Funcionário</th>
                  <th>Entrada</th>
                  <th>Saída Almoço</th>
                  <th>Volta Almoço</th>
                  <th>Saída</th>
                  <th>H. Extras</th>
                  <th>Observação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.data).toLocaleDateString('pt-BR')} <br/><span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>{r.tipo_dia}</span></td>
                    <td style={{ fontWeight: 500 }}>{r.nome}</td>
                    <td>{r.entrada ? r.entrada.substring(0,5) : '-'}</td>
                    <td>{r.saida_almoco ? r.saida_almoco.substring(0,5) : '-'}</td>
                    <td>{r.volta_almoco ? r.volta_almoco.substring(0,5) : '-'}</td>
                    <td>{r.saida ? r.saida.substring(0,5) : '-'}</td>
                    <td><strong style={{ color: r.horas_extras > 0 ? 'var(--primary)' : 'inherit' }}>{r.horas_extras}h</strong></td>
                    <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.observacao}</td>
                    <td>
                      <button className="icon-btn edit" onClick={() => handleOpenEdit(r)} title="Editar">
                        <FiEdit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {registros.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Nenhum registro encontrado para este mês.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
