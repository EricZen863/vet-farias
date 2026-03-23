import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Vet Farias - Gestão Interna',
  description: 'Sistema de gestão interna da clínica veterinária Vet Farias',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
