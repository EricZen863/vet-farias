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
