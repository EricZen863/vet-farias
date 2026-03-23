'use client';
import { useRef, useState } from 'react';
import { FiUpload, FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function ExcelUploader({ onUpload, label = 'Upload Excel' }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatus(null);
      setMessage('Processando...');
      const result = await onUpload(file);
      setStatus('success');
      setMessage(`${result.length} itens carregados com sucesso!`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Erro ao processar arquivo');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="excel-uploader">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        style={{ display: 'none' }}
        id="excel-upload"
      />
      <button className="upload-btn" onClick={() => fileRef.current?.click()}>
        <FiUpload size={18} />
        <span>{label}</span>
      </button>
      {message && (
        <div className={`upload-status ${status === 'success' ? 'upload-success' : status === 'error' ? 'upload-error' : ''}`}>
          {status === 'success' ? <FiCheck /> : status === 'error' ? <FiAlertCircle /> : null}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
