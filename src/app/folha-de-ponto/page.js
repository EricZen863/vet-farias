'use client';
import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiFileText, FiPrinter, FiZap } from 'react-icons/fi';
import { useAuth } from '../../components/AuthProvider';
import Link from 'next/link';

export default function FolhaDePontoPage() {
  const { userType } = useAuth();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFunc, setEditingFunc] = useState(null);
  const [printFolhaFunc, setPrintFolhaFunc] = useState(null);
  const [printFolhaMes, setPrintFolhaMes] = useState(new Date().toISOString().substring(0, 7));

  // Form states
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [profissao, setProfissao] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState(44);
  const [cargaHorariaContrato, setCargaHorariaContrato] = useState(44);
  const [tipoFolha, setTipoFolha] = useState('normal');
  const [funcFake, setFuncFake] = useState(false);
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
      setCargaHorariaContrato(func.carga_horaria_contrato || func.carga_horaria_semanal);
      setTipoFolha(func.tipo_folha || 'normal');
      setJornada(typeof func.jornada === 'string' ? JSON.parse(func.jornada) : func.jornada);
    } else {
      setEditingFunc(null);
      setNome('');
      setCpf('');
      setProfissao('');
      setEmail('');
      setSenha('');
      setCargaHoraria(44);
      setCargaHorariaContrato(44);
      setFuncFake(false);
      setTipoFolha('normal');
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
        nome, cpf, profissao, email,
        carga_horaria_semanal: tipoFolha === 'atipica' ? parseInt(cargaHorariaContrato) : parseInt(cargaHoraria),
        carga_horaria_contrato: parseInt(cargaHorariaContrato),
        tipo_folha: tipoFolha,
        jornada
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

      // If fake employee, generate test data for last month
      if (funcFake && !editingFunc && data.id) {
        try {
          const fakeRes = await fetch('/api/funcionarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate_fake_data', funcionarioId: data.id })
          });
          const fakeData = await fakeRes.json();
          if (fakeData.success) {
            alert(`✅ Funcionário fake criado com sucesso!\n\n${fakeData.inserted || fakeData.recordsGenerated} registros de ponto do mês anterior foram simulados.\nVá em Relatórios para conferir os dados.`);
          } else {
            alert(`⚠️ Funcionário criado, mas houve um problema ao gerar os dados fake:\n${JSON.stringify(fakeData)}`);
          }
        } catch (fakeErr) {
          console.error('Fake data error:', fakeErr);
          alert(`⚠️ Funcionário criado, mas erro ao gerar dados fake:\n${fakeErr.message}`);
        }
      }

      setShowModal(false);
      loadFuncionarios();
    } catch (err) {
      alert('Erro ao salvar funcionário');
    }
  };

  const handleDelete = async (func) => {
    if (!confirm(`⚠️ ATENÇÃO: Excluir "${func.nome}" permanentemente?\n\nTodos os registros de ponto deste funcionário serão apagados. Esta ação NÃO pode ser desfeita!`)) return;
    try {
      await fetch('/api/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: func.id })
      });
      loadFuncionarios();
    } catch (err) {
      alert('Erro ao excluir funcionário');
    }
  };

  const handlePrintFolha = (func, mes) => {
    const [year, month] = mes.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthNames = { 1:'Janeiro',2:'Fevereiro',3:'Março',4:'Abril',5:'Maio',6:'Junho',7:'Julho',8:'Agosto',9:'Setembro',10:'Outubro',11:'Novembro',12:'Dezembro' };
    const diaLabels = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
    const diaSemNomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const jornada = typeof func.jornada === 'string' ? JSON.parse(func.jornada) : (func.jornada || {});

    // Build jornada padrão table
    let jornadaRows = '';
    ['seg','ter','qua','qui','sex','sab','dom'].forEach(dia => {
      const j = jornada[dia];
      jornadaRows += j 
        ? `<tr><td>${diaLabels[dia]}</td><td>${j.entrada||'-'}</td><td>${j.saida_almoco||'-'}</td><td>${j.volta_almoco||'-'}</td><td>${j.saida||'-'}</td></tr>` 
        : `<tr><td>${diaLabels[dia]}</td><td colspan="4" style="text-align:center;color:#999;">Folga</td></tr>`;
    });

    // Build daily rows
    let rows = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const diaSem = diaSemNomes[date.getDay()];
      const dateStr = `${String(d).padStart(2,'0')}/${String(month).padStart(2,'0')}`;
      const isDomingo = date.getDay() === 0;
      const bgStyle = isDomingo ? ' style="background:#f9f9f9;"' : '';
      rows += `<tr${bgStyle}>
        <td style="text-align:center;font-weight:600;">${dateStr}</td>
        <td style="text-align:center;">${diaSem}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>`;
    }

    const printWindow = window.open('', '_blank');
    const html = `<html><head><title>Folha de Ponto - ${func.nome} - ${monthNames[month]}/${year}</title>
      <style>
        body { font-family: sans-serif; padding: 16px; color: #333; font-size: 12px; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 13px; text-align: center; color: #555; margin-top: 0; }
        .info { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 10px; padding: 8px 12px; background: #fafafa; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; }
        .jornada-table { width: auto; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; }
        .jornada-table th, .jornada-table td { border: 1px solid #ccc; padding: 3px 8px; text-align: left; }
        .jornada-table th { background: #f0f0f0; }
        table.main { width: 100%; border-collapse: collapse; }
        table.main th, table.main td { border: 1px solid #333; padding: 6px 4px; text-align: center; }
        table.main th { background: #e8e8e8; font-size: 10px; }
        table.main td { height: 24px; font-size: 11px; }
        .sig-col { width: 90px; }
        .obs-col { width: 70px; }
        @media print {
          body { padding: 0; }
          table.main { page-break-inside: auto; }
          table.main tr { page-break-inside: avoid; }
        }
      </style></head><body>
      <h1>Folha de Ponto</h1>
      <h2>${monthNames[month]} / ${year}</h2>
      <div class="info">
        <div><strong>Nome:</strong> ${func.nome}</div>
        <div><strong>CPF:</strong> ${func.cpf}</div>
        <div><strong>Profissão:</strong> ${func.profissao || '-'}</div>
        <div><strong>Tipo Folha:</strong> ${func.tipo_folha === 'atipica' ? 'Atípica' : 'Normal'}</div>
        ${func.tipo_folha === 'atipica'
          ? `<div><strong>Carga Contratada:</strong> ${func.carga_horaria_contrato || func.carga_horaria_semanal}h/semana</div>
             <div><strong>Compensação Semanal:</strong> ${44 - (parseInt(func.carga_horaria_contrato || func.carga_horaria_semanal) || 44)}h (44h CLT - ${func.carga_horaria_contrato || func.carga_horaria_semanal}h contrato)</div>`
          : `<div><strong>Carga Horária:</strong> ${func.carga_horaria_semanal}h/semana</div>`
        }
      </div>
      <details open style="margin-bottom:10px;font-size:10px;">
        <summary style="cursor:pointer;font-weight:bold;font-size:11px;">Jornada Padrão</summary>
        <table class="jornada-table"><thead><tr><th>Dia</th><th>Entrada</th><th>S.Almoço</th><th>V.Almoço</th><th>Saída</th></tr></thead><tbody>${jornadaRows}</tbody></table>
      </details>
      <div style="margin-bottom:10px;padding:6px 10px;background:#fffde7;border:1px solid #e0d97e;border-radius:5px;font-size:10px;">
        <strong>Coluna "Tipo" — preencher com:</strong> <em>Normal</em> (dia comum) · <em>Feriado Trabalhado</em> · <em>Folga Trabalhada</em> · <em>Falta</em>
      </div>
      <table class="main">
        <thead>
          <tr>
            <th style="width:55px;">Data</th>
            <th style="width:35px;">Dia</th>
            <th style="width:50px;">Tipo</th>
            <th style="width:55px;">Entrada</th>
            <th style="width:55px;">S. Almoço</th>
            <th style="width:55px;">V. Almoço</th>
            <th style="width:55px;">Saída</th>
            <th class="obs-col">Obs</th>
            <th class="sig-col">Assinatura</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 40px; text-align: center; font-size: 11px; page-break-inside: avoid;">
        <div style="width: 300px; border-bottom: 1px solid #333; margin: 0 auto 8px auto;"></div>
        Assinatura do Funcionário<br/>
        <strong>${func.nome}</strong>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }<\/script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setPrintFolhaFunc(null);
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

  // Calcula as horas de trabalho da jornada definida (para exibir o débito semanal)
  const calcHorasJornada = () => {
    let total = 0;
    Object.values(jornada).forEach(j => {
      if (j) {
        const [eh, em] = (j.entrada || '0:0').split(':').map(Number);
        const [sah, sam] = (j.saida_almoco || '0:0').split(':').map(Number);
        const [vah, vam] = (j.volta_almoco || '0:0').split(':').map(Number);
        const [sh, sm] = (j.saida || '0:0').split(':').map(Number);
        const manha = (sah * 60 + sam) - (eh * 60 + em);
        const tarde = (sh * 60 + sm) - (vah * 60 + vam);
        total += (manha + tarde) / 60;
      }
    });
    return Math.round(total * 100) / 100;
  };

  const debitoSemanal = tipoFolha === 'atipica' ? (44 - parseInt(cargaHorariaContrato || 44)) : 0;

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
                  <th>Tipo Folha</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>{f.nome}</td>
                    <td>{f.profissao}</td>
                    <td>{f.cpf}</td>
                    <td>{f.email}</td>
                    <td>
                      {f.tipo_folha === 'atipica' ? (
                        <span>{f.carga_horaria_contrato || f.carga_horaria_semanal}h <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(de 44h)</span></span>
                      ) : (
                        <span>{f.carga_horaria_semanal}h</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${f.tipo_folha === 'atipica' ? 'pendente' : 'pago'}`} style={{ textTransform: 'capitalize' }}>
                        {f.tipo_folha === 'atipica' ? 'Atípica' : 'Normal'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons">
                        <button className="icon-btn" onClick={() => setPrintFolhaFunc(f)} title="Imprimir Folha de Ponto" style={{ color: 'var(--primary-light)' }}>
                          <FiPrinter size={16} />
                        </button>
                        <button className="icon-btn edit" onClick={() => handleOpenModal(f)} title="Editar">
                          <FiEdit2 size={16} />
                        </button>
                        <button className="icon-btn delete" onClick={() => handleDelete(f)} title="Excluir Permanentemente">
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

                {!editingFunc && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px 16px', borderRadius: '8px', border: funcFake ? '1px solid var(--primary)' : '1px solid var(--border)', background: funcFake ? 'rgba(140, 105, 172, 0.15)' : 'transparent', transition: 'all 0.2s', width: '100%' }}>
                      <input type="checkbox" checked={funcFake} onChange={e => setFuncFake(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      <FiZap size={18} style={{ color: funcFake ? 'var(--primary-light)' : 'var(--text-secondary)' }} />
                      <div>
                        <span style={{ fontWeight: 600, color: funcFake ? 'var(--primary-light)' : 'var(--text)', fontSize: '14px' }}>Funcionário Fake (Teste)</span>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                          Gera automaticamente 3 semanas de registros de ponto simulados para testar relatórios.
                        </p>
                      </div>
                    </label>
                  </div>
                )}


                <div className="form-group">
                  <label className="form-label">Tipo de Folha de Ponto</label>
                  <select className="form-input" value={tipoFolha} onChange={e => setTipoFolha(e.target.value)}>
                    <option value="normal">Normal (44h semanais)</option>
                    <option value="atipica">Atípica (menos de 44h semanais)</option>
                  </select>
                </div>

                {tipoFolha === 'atipica' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Horas Contratadas por Semana</label>
                      <input type="number" className="form-input" value={cargaHorariaContrato} onChange={e => setCargaHorariaContrato(e.target.value)} required />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        A referência da CLT é 44h. Se contrato é {cargaHorariaContrato}h, há um débito de {44 - parseInt(cargaHorariaContrato || 44)}h/semana.
                      </span>
                    </div>
                    <div style={{ gridColumn: '1 / -1', padding: '12px 16px', background: 'rgba(140, 105, 172, 0.1)', borderRadius: '8px', border: '1px solid rgba(140, 105, 172, 0.2)' }}>
                      <strong style={{ color: 'var(--primary-light)', fontSize: '14px' }}>⚠️ Como funciona a Folha Atípica:</strong>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                        Este funcionário trabalha <strong>{cargaHorariaContrato}h</strong> de um total de <strong>44h</strong> semanais (CLT). 
                        Sobram <strong>{44 - parseInt(cargaHorariaContrato || 44)}h</strong> de débito por semana.<br/>
                        Se durante a semana ele trabalhar horas a mais, essas horas primeiro <strong>compensam o débito</strong>. 
                        Só será contabilizado como <strong>hora extra</strong> o que ultrapassar essas {44 - parseInt(cargaHorariaContrato || 44)}h de compensação.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Carga Horária Semanal (h)</label>
                    <input type="number" className="form-input" value={cargaHoraria} onChange={e => setCargaHoraria(e.target.value)} required />
                  </div>
                )}
                
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

      {printFolhaFunc && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Imprimir Folha de Ponto</h2>
              <button className="close-btn" onClick={() => setPrintFolhaFunc(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <strong>Funcionário:</strong> {printFolhaFunc.nome}
              </div>
              <div className="form-group">
                <label className="form-label">Mês de Referência</label>
                <input 
                  type="month" 
                  className="form-input" 
                  value={printFolhaMes} 
                  onChange={(e) => setPrintFolhaMes(e.target.value)} 
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Será gerada uma folha em branco com todas as datas do mês selecionado para o funcionário preencher manualmente.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPrintFolhaFunc(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => handlePrintFolha(printFolhaFunc, printFolhaMes)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiPrinter size={14} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
