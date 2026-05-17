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

  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    return new Date(dStr.split('T')[0] + 'T12:00:00');
  };

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

  const handlePrintPDF = (emp, tipo) => {
    const monthEmp = { ...emp };
    const summary = calcWeeklySummary(monthEmp);
    const recMonth = emp.records.length > 0 ? emp.records[0].data.substring(0, 7) : mesAtual;
    const empInfoHTML = buildEmpInfoHTML(emp);
    const isAtipica = emp.tipo_folha === 'atipica';

    // Build weekly tables
    let weekTablesHTML = '';
    summary.weeks.forEach(week => {
      const fmtD = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const recs = tipo === 'extras' ? week.records.filter(r => (parseFloat(r.horas_extras) || 0) > 0 || r.tipo_dia === 'feriado' || r.tipo_dia === 'folga' || r.tipo_dia === 'falta') : week.records;
      if (recs.length === 0) return;
      const classifCol = isAtipica ? '<th>Classificação</th>' : '';
      weekTablesHTML += `<h3 style="font-size:13px;margin:18px 0 6px 0;border-bottom:1px solid #eee;padding-bottom:4px;">Semana ${week.weekNum} (${fmtD(week.start)} - ${fmtD(week.end)})</h3>`;
      weekTablesHTML += `<table><thead><tr><th>Data</th><th>Dia</th><th>Tipo</th><th>Entrada</th><th>S. Almoço</th><th>V. Almoço</th><th>Saída</th><th>H. Exc</th>${classifCol}<th>Obs</th></tr></thead><tbody>`;
      recs.forEach(r => {
        const he = parseFloat(r.horas_extras) || 0;
        const isReal = r.dayReal > 0;
        const rowStyle = isReal ? ' style="background:#fff0f0;"' : '';
        let classifCell = '';
        if (isAtipica) {
          if (he === 0) classifCell = '<td style="color:#999;">-</td>';
          else if (r.is100) classifCell = `<td class="extra" style="font-weight:bold;">HE Real 100% (${r.dayReal}h)</td>`;
          else if (isReal && r.dayComp > 0) classifCell = `<td><span class="extra">HE Real ${r.dayReal}h</span><br><span class="compensacao">Comp ${r.dayComp}h</span></td>`;
          else if (isReal) classifCell = `<td class="extra">HE Real ${r.dayReal}h</td>`;
          else classifCell = `<td class="compensacao">Comp ${r.dayComp}h</td>`;
        }
        const diaSemPdf = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][parseDate(r.data).getDay()];
        const displayTipo = r.tipo_dia === 'folga' && (he > 0 || r.entrada) ? 'Folga Trabalhada' : 
                            r.tipo_dia === 'feriado' && (he > 0 || r.entrada) ? 'Feriado Trabalhado' : 
                            (r.tipo_dia || 'Normal');
        weekTablesHTML += `<tr${rowStyle}><td>${parseDate(r.data).toLocaleDateString('pt-BR')}</td><td>${diaSemPdf}</td><td style="text-transform:capitalize;">${displayTipo}</td><td>${r.entrada ? r.entrada.substring(0,5) : '-'}</td><td>${r.saida_almoco ? r.saida_almoco.substring(0,5) : '-'}</td><td>${r.volta_almoco ? r.volta_almoco.substring(0,5) : '-'}</td><td>${r.saida ? r.saida.substring(0,5) : '-'}</td><td class="${isReal ? 'extra' : he > 0 ? 'compensacao' : ''}">${he}h</td>${classifCell}<td>${r.observacao || ''}</td></tr>`;
      });
      weekTablesHTML += `</tbody></table>`;
      // Week summary
      weekTablesHTML += `<div style="display:flex;flex-direction:column;gap:6px;font-size:11px;padding:8px;background:#f5f5f5;border-radius:4px;margin-top:4px;">`;
      weekTablesHTML += `<div style="display:flex;gap:20px;">`;
      weekTablesHTML += `<span><strong>Exc:</strong> ${week.totalExtras}h</span>`;
      if (isAtipica) weekTablesHTML += `<span style="color:#1565c0;"><strong>Comp:</strong> ${week.weekComp}h</span>`;
      weekTablesHTML += `<span style="color:${week.weekReal > 0 ? '#d32f2f' : '#333'};"><strong>HE Real:</strong> ${week.weekReal}h</span>`;
      weekTablesHTML += `</div>`;
      weekTablesHTML += `<div style="display:flex;gap:20px;color:#555;">`;
      weekTablesHTML += `<span><strong>Feriados:</strong> ${week.feriados}</span>`;
      weekTablesHTML += `<span><strong>Folgas:</strong> ${week.folgas}</span>`;
      weekTablesHTML += `<span><strong>Faltas:</strong> ${week.faltas}</span>`;
      weekTablesHTML += `</div></div>`;
    });

    // Monthly total
    let monthTotalHTML = `<div style="margin-top:16px;padding:10px;border:2px solid #333;border-radius:6px;font-size:13px;display:flex;flex-direction:column;gap:8px;">`;
    monthTotalHTML += `<div><strong>📊 TOTAL MENSAL:</strong>&nbsp;&nbsp; Excedentes: ${summary.totalExtrasBruto}h`;
    if (isAtipica) monthTotalHTML += `&nbsp;&nbsp;|&nbsp;&nbsp;<span style="color:#1565c0;">Compensação: ${summary.totalCompensacao}h</span>`;
    monthTotalHTML += `&nbsp;&nbsp;|&nbsp;&nbsp;<span style="color:#d32f2f;font-weight:bold;">HE Reais: ${summary.totalExtrasReais}h</span></div>`;
    monthTotalHTML += `<div style="font-size:12px;color:#555;">`;
    monthTotalHTML += `<strong>Feriados:</strong> ${summary.totalFeriados}&nbsp;&nbsp;|&nbsp;&nbsp;`;
    monthTotalHTML += `<strong>Folgas:</strong> ${summary.totalFolgas}&nbsp;&nbsp;|&nbsp;&nbsp;`;
    monthTotalHTML += `<strong>Faltas:</strong> ${summary.totalFaltas}`;
    monthTotalHTML += `</div></div>`;

    const printWindow = window.open('', '_blank');
    const html = `<html><head><title>Relatório - ${emp.nome} - ${recMonth}</title>
      <style>
        body { font-family: sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 5px 6px; text-align: left; }
        th { background-color: #f5f5f5; }
        .extra { color: #d32f2f; font-weight: bold; }
        .compensacao { color: #1565c0; font-weight: bold; }
      </style></head><body>
      <h1>Relatório de Ponto - ${emp.nome} - ${recMonth}</h1>
      ${empInfoHTML}
      <p><strong>Tipo:</strong> ${tipo === 'todos' ? 'Todos os dias' : 'Apenas Extras/Feriados/Folgas'}</p>
      ${weekTablesHTML}
      ${monthTotalHTML}
      ${isAtipica ? '<p style="font-size:10px;color:#666;margin-top:12px;">* Horas excedentes compensam o débito semanal primeiro. Somente o excedente além do débito = Hora Extra Real.</p>' : ''}
      <div style="margin-top: 50px; text-align: center; font-size: 12px; page-break-inside: avoid;">
        <div style="width: 300px; border-bottom: 1px solid #333; margin: 0 auto 10px auto;"></div>
        Assinatura do Funcionário<br />
        <strong>${emp.nome}</strong>
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const groupedRegistros = registros.reduce((acc, curr) => {
    if (!acc[curr.funcionario_id]) {
      acc[curr.funcionario_id] = {
        id: curr.funcionario_id,
        nome: curr.nome,
        cpf: curr.cpf,
        profissao: curr.profissao || '',
        tipo_folha: curr.tipo_folha || 'normal',
        carga_horaria_contrato: curr.carga_horaria_contrato || curr.carga_horaria_semanal || 44,
        carga_horaria_semanal: curr.carga_horaria_semanal || 44,
        func_jornada: curr.func_jornada || {},
        records: []
      };
    }
    acc[curr.funcionario_id].records.push(curr);
    return acc;
  }, {});

  // For atypical employees, calculate real overtime (excess beyond weekly debt)
  // Returns per-week breakdown with per-day classification
  const calcWeeklySummary = (emp) => {
    const debitoSemanal = emp.tipo_folha === 'atipica' ? (44 - (parseInt(emp.carga_horaria_contrato) || 44)) : 0;
    const weekMap = {};
    const sorted = [...emp.records].sort((a, b) => parseDate(a.data) - parseDate(b.data));
    sorted.forEach(r => {
      const d = parseDate(r.data);
      // ISO week: Monday-based
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
      if (!weekMap[weekKey]) weekMap[weekKey] = { start: monday, records: [], totalExtras: 0, feriados: 0, folgas: 0, faltas: 0 };
      weekMap[weekKey].records.push(r);
      weekMap[weekKey].totalExtras += (parseFloat(r.horas_extras) || 0);
      if (r.tipo_dia === 'feriado') weekMap[weekKey].feriados += 1;
      if (r.tipo_dia === 'folga') weekMap[weekKey].folgas += 1;
      if (r.tipo_dia === 'falta') weekMap[weekKey].faltas += 1;
    });
    let totalExtrasReais = 0, totalCompensacao = 0, totalExtrasBruto = 0;
    let totalFeriados = 0, totalFolgas = 0, totalFaltas = 0;
    const weeks = Object.keys(weekMap).sort().map((wk, idx) => {
      const w = weekMap[wk];
      const weekExtras = w.totalExtras;
      totalExtrasBruto += weekExtras;
      let weekComp = 0, weekReal = 0;
      // Classify each day within this week
      let cumExtras = 0;
      const classifiedRecords = w.records.map(r => {
        const he = parseFloat(r.horas_extras) || 0;
        let dayComp = 0, dayReal = 0;
        let is100 = false;
        if (he > 0) {
          if (r.tipo_dia === 'feriado' || r.tipo_dia === 'folga') {
            dayReal = he;
            is100 = true;
          } else if (emp.tipo_folha === 'atipica') {
            const remainingDebt = Math.max(0, debitoSemanal - cumExtras);
            dayComp = Math.min(he, remainingDebt);
            dayReal = Math.max(0, he - remainingDebt);
            cumExtras += he;
          } else {
            dayReal = he;
          }
        }
        weekComp += dayComp;
        weekReal += dayReal;
        return { ...r, dayComp: Math.round(dayComp * 100) / 100, dayReal: Math.round(dayReal * 100) / 100, is100 };
      });
      totalCompensacao += weekComp;
      totalExtrasReais += weekReal;
      totalFeriados += w.feriados;
      totalFolgas += w.folgas;
      totalFaltas += w.faltas;
      const endDate = new Date(w.start);
      endDate.setDate(endDate.getDate() + 6);
      return { 
        weekKey: wk, weekNum: idx + 1, start: w.start, end: endDate, records: classifiedRecords, 
        totalExtras: Math.round(weekExtras * 100) / 100, weekComp: Math.round(weekComp * 100) / 100, weekReal: Math.round(weekReal * 100) / 100,
        feriados: w.feriados, folgas: w.folgas, faltas: w.faltas
      };
    });
    return { 
      weeks, totalExtrasBruto: Math.round(totalExtrasBruto * 100) / 100, totalCompensacao: Math.round(totalCompensacao * 100) / 100, 
      totalExtrasReais: Math.round(totalExtrasReais * 100) / 100, debitoSemanal,
      totalFeriados, totalFolgas, totalFaltas
    };
  };

  const calcExtrasReais = (emp) => calcWeeklySummary(emp).totalExtrasReais;

  // Generate employee info HTML for PDF
  const buildEmpInfoHTML = (emp) => {
    const diaLabels = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
    const jornada = typeof emp.func_jornada === 'string' ? JSON.parse(emp.func_jornada) : (emp.func_jornada || {});
    const summary = calcWeeklySummary(emp);
    let jornadaRows = '';
    ['seg','ter','qua','qui','sex','sab','dom'].forEach(dia => {
      const j = jornada[dia];
      jornadaRows += j ? `<tr><td>${diaLabels[dia]}</td><td>${j.entrada||'-'}</td><td>${j.saida_almoco||'-'}</td><td>${j.volta_almoco||'-'}</td><td>${j.saida||'-'}</td></tr>` : `<tr><td>${diaLabels[dia]}</td><td colspan="4" style="text-align:center;color:#999;">Folga</td></tr>`;
    });
    let resumoHTML = `<p><strong>Total Horas Excedentes (bruto):</strong> ${summary.totalExtrasBruto}h</p>`;
    if (emp.tipo_folha === 'atipica') {
      resumoHTML += `<p><strong>Débito Semanal:</strong> ${summary.debitoSemanal}h (44h - ${emp.carga_horaria_contrato}h contrato)</p>`;
      resumoHTML += `<p><strong>Compensação de Débito:</strong> ${summary.totalCompensacao}h</p>`;
    }
    resumoHTML += `<p style="font-size:14px;"><strong>✅ Horas Extras Reais:</strong> <span style="color:#d32f2f;font-size:16px;font-weight:bold;">${summary.totalExtrasReais}h</span></p>`;
    resumoHTML += `<div style="display:flex;gap:20px;margin-top:10px;font-size:12px;color:#555;border-top:1px dashed #ccc;padding-top:10px;">`;
    resumoHTML += `<span><strong>Feriados:</strong> ${summary.totalFeriados}</span>`;
    resumoHTML += `<span><strong>Folgas:</strong> ${summary.totalFolgas}</span>`;
    resumoHTML += `<span><strong>Faltas:</strong> ${summary.totalFaltas}</span>`;
    resumoHTML += `</div>`;
    return `
      <div style="display:flex;gap:30px;flex-wrap:wrap;margin-bottom:15px;font-size:12px;border:1px solid #ddd;padding:12px;border-radius:6px;background:#fafafa;">
        <div><strong>Nome:</strong> ${emp.nome}</div>
        <div><strong>CPF:</strong> ${emp.cpf}</div>
        <div><strong>Profissão:</strong> ${emp.profissao || '-'}</div>
        <div><strong>Tipo Folha:</strong> ${emp.tipo_folha === 'atipica' ? 'Atípica' : 'Normal'}</div>
        <div><strong>Carga Horária:</strong> ${emp.carga_horaria_contrato}h/semana</div>
      </div>
      <details open style="margin-bottom:15px;font-size:11px;"><summary style="cursor:pointer;font-weight:bold;font-size:12px;">Jornada de Trabalho Padrão</summary>
        <table style="width:auto;margin-top:6px;font-size:11px;"><thead><tr><th>Dia</th><th>Entrada</th><th>S. Almoço</th><th>V. Almoço</th><th>Saída</th></tr></thead><tbody>${jornadaRows}</tbody></table>
      </details>
      <div style="margin-bottom:15px;padding:10px;border:1px solid #ddd;border-radius:6px;background:#f0f0f0;font-size:12px;">${resumoHTML}</div>
    `;
  };

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
            const totalExtras = calcExtrasReais(emp);
            const totalExtrasRaw = emp.records.reduce((sum, r) => sum + (parseFloat(r.horas_extras) || 0), 0);
            return (
              <div key={emp.id} className="card" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setSelectedEmployee(emp)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>{emp.nome}</h3>
                  {emp.tipo_folha === 'atipica' && (
                    <span className="status-badge status-pendente" style={{ fontSize: '10px', padding: '2px 8px' }}>Atípica</span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>CPF: {emp.cpf}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <span>Registros: <strong>{emp.records.length}</strong></span>
                  <span style={{ color: totalExtras > 0 ? 'var(--primary-light)' : 'inherit' }}>
                    Extras: <strong>{totalExtras}h</strong>
                    {emp.tipo_folha === 'atipica' && totalExtrasRaw !== totalExtras && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>(bruto: {totalExtrasRaw}h)</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedEmployee && (() => {
        // Group records by month (YYYY-MM)
        const monthGroups = {};
        selectedEmployee.records.sort((a, b) => parseDate(a.data) - parseDate(b.data)).forEach(r => {
          const monthKey = r.data.substring(0, 7);
          if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
          monthGroups[monthKey].push(r);
        });
        const months = Object.keys(monthGroups).sort().reverse();
        const monthNames = { '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho','07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro' };
        const formatMonth = (ym) => { const [y, m] = ym.split('-'); return `${monthNames[m] || m}/${y}`; };

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '950px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h2>Relatórios - {selectedEmployee.nome}</h2>
                <button className="close-btn" onClick={() => setSelectedEmployee(null)}>&times;</button>
              </div>
              <div className="modal-body">
                {/* Employee info summary */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', fontSize: '13px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div><strong>CPF:</strong> {selectedEmployee.cpf}</div>
                  <div><strong>Profissão:</strong> {selectedEmployee.profissao || '-'}</div>
                  <div><strong>Tipo:</strong> {selectedEmployee.tipo_folha === 'atipica' ? 'Atípica' : 'Normal'}</div>
                  <div><strong>Carga:</strong> {selectedEmployee.carga_horaria_contrato}h/sem</div>
                </div>

                {/* Month cards */}
                {months.map(ym => {
                  const recs = monthGroups[ym];
                  const monthEmp = { ...selectedEmployee, records: recs };
                  const summary = calcWeeklySummary(monthEmp);
                  const isAtip = selectedEmployee.tipo_folha === 'atipica';
                  const fmtDate = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                  return (
                    <div key={ym} className="card" style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>📅 {formatMonth(ym)}</h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn-primary" onClick={() => handlePrintPDF({ ...selectedEmployee, records: recs }, 'todos')} style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiDownload size={12} /> Imprimir Tudo
                          </button>
                          <button className="btn-secondary" onClick={() => handlePrintPDF({ ...selectedEmployee, records: recs }, 'extras')} style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiDownload size={12} /> Só Extras
                          </button>
                        </div>
                      </div>
                      {/* Weekly breakdown */}
                      {summary.weeks.map(week => (
                        <div key={week.weekKey} style={{ marginBottom: '14px', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: '12px', fontWeight: 600 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <span>Semana {week.weekNum} ({fmtDate(week.start)} - {fmtDate(week.end)})</span>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                                <span>Exc: {week.totalExtras}h</span>
                                {isAtip && <span style={{ color: '#1565c0' }}>Comp: {week.weekComp}h</span>}
                                <span style={{ color: week.weekReal > 0 ? '#d32f2f' : 'inherit', fontWeight: week.weekReal > 0 ? 700 : 400 }}>HE Real: {week.weekReal}h</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                              <span>Feriados: {week.feriados}</span>
                              <span>Folgas: {week.folgas}</span>
                              <span>Faltas: {week.faltas}</span>
                            </div>
                          </div>
                          <div className="table-responsive">
                            <table className="table" style={{ width: '100%', fontSize: '11px', margin: 0 }}>
                              <thead>
                                <tr>
                                  <th>Data</th><th>Dia</th><th>Tipo</th><th>Entrada</th><th>S.Alm</th><th>V.Alm</th><th>Saída</th><th>H.Exc</th>{isAtip && <th>Classif.</th>}<th>Obs</th><th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {week.records.map(r => {
                                  const he = parseFloat(r.horas_extras) || 0;
                                  const isReal = r.dayReal > 0;
                                  const displayTipo = r.tipo_dia === 'folga' && (he > 0 || r.entrada) ? 'Folga Trabalhada' : 
                                                      r.tipo_dia === 'feriado' && (he > 0 || r.entrada) ? 'Feriado Trabalhado' : 
                                                      (r.tipo_dia || 'Normal');
                                  return (
                                    <tr key={r.id} style={isReal ? { background: 'rgba(211,47,47,0.07)' } : {}}>
                                      <td>{parseDate(r.data).toLocaleDateString('pt-BR')}</td>
                                      <td>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][parseDate(r.data).getDay()]}</td>
                                      <td style={{ textTransform: 'capitalize' }}>{displayTipo}</td>
                                      <td>{r.entrada ? r.entrada.substring(0,5) : '-'}</td>
                                      <td>{r.saida_almoco ? r.saida_almoco.substring(0,5) : '-'}</td>
                                      <td>{r.volta_almoco ? r.volta_almoco.substring(0,5) : '-'}</td>
                                      <td>{r.saida ? r.saida.substring(0,5) : '-'}</td>
                                      <td><strong style={{ color: isReal ? '#d32f2f' : he > 0 ? '#1565c0' : 'inherit' }}>{he}h</strong></td>
                                      {isAtip && <td style={{ fontSize: '10px', fontWeight: 600, color: isReal ? '#d32f2f' : he > 0 ? '#1565c0' : '#999' }}>
                                        {he === 0 ? '-' : r.is100 ? `HE Real 100% (${r.dayReal}h)` : isReal ? `HE Real ${r.dayReal}h` : `Comp ${r.dayComp}h`}
                                        {r.dayReal > 0 && r.dayComp > 0 && !r.is100 && <><br/><span style={{ color: '#1565c0' }}>Comp {r.dayComp}h</span></>}
                                      </td>}
                                      <td style={{ maxWidth: '60px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.observacao}>{r.observacao}</td>
                                      <td>
                                        <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); handleOpenEdit(r); }} title="Editar">
                                          <FiEdit2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                      {/* Monthly total */}
                      <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontWeight: 600, marginTop: '4px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <span>📊 Total Mensal:</span>
                          <span>Excedentes: {summary.totalExtrasBruto}h</span>
                          {isAtip && <span style={{ color: '#1565c0' }}>Compensação: {summary.totalCompensacao}h</span>}
                          <span style={{ color: summary.totalExtrasReais > 0 ? '#d32f2f' : 'inherit' }}>HE Reais: {summary.totalExtrasReais}h</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          <span>Feriados: {summary.totalFeriados}</span>
                          <span>Folgas: {summary.totalFolgas}</span>
                          <span>Faltas: {summary.totalFaltas}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {editingRecord && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Editar Ponto - {parseDate(editingRecord.data).toLocaleDateString('pt-BR')}</h2>
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
