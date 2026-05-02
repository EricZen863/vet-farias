'use client';
import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiPrinter } from 'react-icons/fi';
import { useAuth } from '../../components/AuthProvider';
import Link from 'next/link';

export default function FolhaDePontoPage() {
  const { userType } = useAuth();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFunc, setEditingFunc] = useState(null);

  // Form states
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [profissao, setProfissao] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState(44);
  const [jornada, setJornada] = useState({
    seg: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
    ter: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
    qua: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
    qui: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
    sex: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
    sab: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '13:00' },
    dom: null // null means Folga
  });

  useEffect(() => {
    if (userType === 'admin') {
      loadFuncionarios();
    }
  }, [userType]);

  const loadFuncionarios = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/funcionarios');
      const data = await res.json();
      setFuncionarios(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (func = null) => {
    if (func) {
      setEditingFunc(func);
      setNome(func.nome);
      setCpf(func.cpf);
      setProfissao(func.profissao || '');
      setEmail(func.email);
      setSenha(''); // Keep blank for editing
      setCargaHoraria(func.carga_horaria_semanal);
      setJornada(typeof func.jornada === 'string' ? JSON.parse(func.jornada) : func.jornada);
    } else {
      setEditingFunc(null);
      setNome('');
      setCpf('');
      setProfissao('');
      setEmail('');
      setSenha('');
      setCargaHoraria(44);
      setJornada({
        seg: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
        ter: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
        qua: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
        qui: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
        sex: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' },
        sab: { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '13:00' },
        dom: null
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        action: editingFunc ? 'update' : 'create',
        id: editingFunc?.id,
        nome, cpf, profissao, email, carga_horaria_semanal: cargaHoraria, jornada
      };
      if (senha) payload.senha = senha;

      const res = await fetch('/api/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setShowModal(false);
      loadFuncionarios();
    } catch (err) {
      alert('Erro ao salvar funcionário');
    }
  };

  const toggleAtivo = async (id) => {
    if (!confirm('Deseja alterar o status deste funcionário?')) return;
    await fetch('/api/funcionarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id })
    });
    loadFuncionarios();
  };

  const handleJornadaChange = (dia, field, value) => {
    const newJornada = { ...jornada };
    if (!newJornada[dia]) newJornada[dia] = { entrada: '', saida_almoco: '', volta_almoco: '', saida: '' };
    newJornada[dia][field] = value;
    setJornada(newJornada);
  };

  const toggleDiaFolga = (dia) => {
    const newJornada = { ...jornada };
    if (newJornada[dia] === null) {
      newJornada[dia] = { entrada: '09:00', saida_almoco: '12:00', volta_almoco: '13:00', saida: '18:00' };
    } else {
      newJornada[dia] = null;
    }
    setJornada(newJornada);
  };

  if (userType !== 'admin') return <div className="page-container">Acesso Negado</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Folha de Ponto</h1>
          <p className="page-description">Gerenciamento de funcionários e registros de ponto.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/folha-de-ponto/qrcode" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPrinter /> QR Codes
          </Link>
          <Link href="/folha-de-ponto/relatorios" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiFileText /> Relatórios
          </Link>
          <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPlus /> Novo Funcionário
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
                  <th>Nome</th>
                  <th>Profissão</th>
                  <th>CPF</th>
                  <th>E-mail</th>
                  <th>Carga Horária</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map(f => (
                  <tr key={f.id} style={{ opacity: f.ativo ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 500 }}>{f.nome}</td>
                    <td>{f.profissao}</td>
                    <td>{f.cpf}</td>
                    <td>{f.email}</td>
                    <td>{f.carga_horaria_semanal}h</td>
                    <td>
                      <span className={`status-badge status-${f.ativo ? 'pago' : 'falta'}`}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons">
                        <button className="icon-btn edit" onClick={() => handleOpenModal(f)} title="Editar">
                          <FiEdit2 size={16} />
                        </button>
                        <button className="icon-btn delete" onClick={() => toggleAtivo(f.id)} title={f.ativo ? 'Desativar' : 'Ativar'}>
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {funcionarios.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Nenhum funcionário cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h2>{editingFunc ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input type="text" className="form-input" value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input type="text" className="form-input" value={cpf} onChange={e => setCpf(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha {editingFunc && <span style={{fontSize: '12px', color: '#666'}}>(deixe em branco para não alterar)</span>}</label>
                  <input type="text" className="form-input" value={senha} onChange={e => setSenha(e.target.value)} required={!editingFunc} />
                </div>
                <div className="form-group">
                  <label className="form-label">Profissão</label>
                  <input type="text" className="form-input" value={profissao} onChange={e => setProfissao(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Carga Horária Semanal (h)</label>
                  <input type="number" className="form-input" value={cargaHoraria} onChange={e => setCargaHoraria(e.target.value)} required />
                </div>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <h3 style={{ margin: '16px 0 8px 0', fontSize: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Jornada de Trabalho Padrão</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Dia</th>
                          <th>Entrada</th>
                          <th>Saída Almoço</th>
                          <th>Volta Almoço</th>
                          <th>Saída</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(dia => {
                          const diaLabels = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };
                          const j = jornada[dia];
                          return (
                            <tr key={dia}>
                              <td style={{ fontWeight: 500 }}>{diaLabels[dia]}</td>
                              {j ? (
                                <>
                                  <td><input type="time" className="form-input" style={{ padding: '4px' }} value={j.entrada || ''} onChange={e => handleJornadaChange(dia, 'entrada', e.target.value)} /></td>
                                  <td><input type="time" className="form-input" style={{ padding: '4px' }} value={j.saida_almoco || ''} onChange={e => handleJornadaChange(dia, 'saida_almoco', e.target.value)} /></td>
                                  <td><input type="time" className="form-input" style={{ padding: '4px' }} value={j.volta_almoco || ''} onChange={e => handleJornadaChange(dia, 'volta_almoco', e.target.value)} /></td>
                                  <td><input type="time" className="form-input" style={{ padding: '4px' }} value={j.saida || ''} onChange={e => handleJornadaChange(dia, 'saida', e.target.value)} /></td>
                                  <td><button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => toggleDiaFolga(dia)}>Marcar Folga</button></td>
                                </>
                              ) : (
                                <>
                                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Folga</td>
                                  <td><button type="button" className="btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => toggleDiaFolga(dia)}>Definir Horário</button></td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
