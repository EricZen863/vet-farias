import * as XLSX from 'xlsx';

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        const normalized = jsonData.map(row => {
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.trim().toLowerCase();
            normalizedRow[normalizedKey] = row[key];
          });
          return {
            coleta: normalizedRow['coleta'] || normalizedRow['nome'] || normalizedRow['exame'] || '',
            precoCusto: parseFloat(normalizedRow['preço de custo'] || normalizedRow['preco de custo'] || normalizedRow['custo'] || normalizedRow['preço'] || normalizedRow['preco'] || 0),
            prazoEntrega: normalizedRow['prazo de entrega'] || normalizedRow['prazo'] || '',
            repasse: parseFloat(normalizedRow['repasse'] || normalizedRow['valor repasse'] || 0),
            lucro: parseFloat(normalizedRow['lucro'] || 0),
          };
        }).filter(row => row.coleta);

        resolve(normalized);
      } catch (err) {
        reject(new Error('Erro ao processar o arquivo Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta o catálogo salvo de um laboratório em formato .xlsx para download.
 * @param {Array} catalogo - Lista de coletas/exames [{ coleta, precoCusto, prazoEntrega, repasse, lucro }]
 * @param {string} labNome - Nome do laboratório (ex: "Diags") para nomear o arquivo
 */
export function exportCatalogToExcel(catalogo, labNome = 'Laboratorio') {
  if (!catalogo || catalogo.length === 0) {
    alert('Nenhum exame cadastrado no catálogo deste laboratório.');
    return;
  }

  const rows = catalogo.map(item => ({
    'Coleta': item.coleta || '',
    'Preço de Custo': typeof item.precoCusto === 'number' ? item.precoCusto : (parseFloat(item.precoCusto) || 0),
    'Prazo de Entrega': item.prazoEntrega || '',
    'Repasse': typeof item.repasse === 'number' ? item.repasse : (parseFloat(item.repasse) || 0),
    'Lucro': typeof item.lucro === 'number' ? item.lucro : (parseFloat(item.lucro) || 0),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Ajuste de largura das colunas para leitura confortável no Excel
  worksheet['!cols'] = [
    { wch: 35 }, // Coleta
    { wch: 16 }, // Preço de Custo
    { wch: 18 }, // Prazo de Entrega
    { wch: 14 }, // Repasse
    { wch: 14 }  // Lucro
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tabela de Preços');

  const cleanName = (labNome || 'Laboratorio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  const fileName = `tabela_${cleanName}.xlsx`;

  try {
    XLSX.writeFile(workbook, fileName);
  } catch (err) {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }
}
