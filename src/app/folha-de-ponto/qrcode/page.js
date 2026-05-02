'use client';
import { useAuth } from '../../components/AuthProvider';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiPrinter } from 'react-icons/fi';

export default function QRCodePage() {
  const { userType } = useAuth();
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userType === 'admin') {
      fetch('/api/funcionarios')
        .then(res => res.json())
        .then(data => {
          setFuncionarios(data.filter(f => f.ativo));
          setLoading(false);
        });
    }
  }, [userType]);

  const handlePrint = () => {
    window.print();
  };

  if (userType !== 'admin') return <div className="page-container">Acesso Negado</div>;

  return (
    <div className="page-container">
      <div className="page-header print-hide">
        <div>
          <Link href="/folha-de-ponto" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '8px', textDecoration: 'none' }}>
            <FiArrowLeft /> Voltar para Funcionários
          </Link>
          <h1 className="page-title">Crachás / QR Codes</h1>
          <p className="page-description">Imprima os QR Codes para acesso rápido dos funcionários.</p>
        </div>
        <button className="btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiPrinter /> Imprimir
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="qr-grid">
          {funcionarios.map(func => {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vet-farias.vercel.app';
            const qrUrl = `${baseUrl}/login?type=funcionario&email=${encodeURIComponent(func.email)}`;

            return (
              <div key={func.id} className="qr-card">
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 4px 0' }}>{func.nome}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{func.profissao}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
                  <QRCodeSVG value={qrUrl} size={150} level="M" includeMargin={true} />
                </div>
                <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '16px', color: '#666' }}>
                  Aponte a câmera do celular para bater o ponto.
                </p>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }
        .qr-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        @media print {
          .print-hide { display: none !important; }
          .sidebar { display: none !important; }
          .app-layout { grid-template-columns: 1fr !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .qr-grid { 
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 20px !important; 
          }
          .qr-card {
            width: 250px;
            page-break-inside: avoid;
            border: 2px dashed #ccc;
          }
        }
      `}</style>
    </div>
  );
}
