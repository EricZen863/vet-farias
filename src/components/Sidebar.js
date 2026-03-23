'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { FiHome, FiDroplet, FiScissors, FiMonitor, FiDollarSign, FiCreditCard, FiSettings, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: FiHome },
  { href: '/laboratorio', label: 'Laboratório', icon: FiDroplet },
  { href: '/volantes-cirurgioes', label: 'Volantes Cirurgiões', icon: FiScissors },
  { href: '/volantes-imagem', label: 'Volantes Imagem', icon: FiMonitor },
  { href: '/gastos', label: 'Gastos Diversos', icon: FiDollarSign },
  { href: '/maquinetas', label: 'Maquinetas', icon: FiCreditCard },
  { href: '/configuracoes', label: 'Configurações', icon: FiSettings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🐾</span>
            <div>
              <h1 className="logo-title">Vet Farias</h1>
              <p className="logo-subtitle">Gestão Interna</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const isHome = item.href === '/';
            const active = isHome ? pathname === '/' : isActive;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={() => setMobileOpen(false)}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <FiLogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
    </>
  );
}
