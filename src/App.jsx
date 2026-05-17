import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ClientesPage from './pages/ClientesPage'
import PresupuestosPage from './pages/PresupuestosPage'
import InformesPage from './pages/InformesPage'
import './index.css'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '', section: 'PRINCIPAL' },
  { id: 'clientes', label: 'Clientes', icon: '', section: 'GESTIÓN' },
  { id: 'presupuestos', label: 'Presupuestos', icon: '', section: 'GESTIÓN' },
  { id: 'informes', label: 'Informes Técnicos', icon: '', section: 'GESTIÓN' },
]

function Sidebar({ current, setCurrent, isOpen, setIsOpen }) {
  const { user, signOut } = useAuth()
  const sections = [...new Set(NAV.map(n => n.section))]
  const initials = user?.email?.slice(0, 2).toUpperCase() || '??'
  const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="sidebar-close" onClick={() => setIsOpen(false)}>✕</button>
      
      <div className="sidebar-brand">
        <div className="brand-text">Mantenizapp</div>
        <div className="brand-sub">SISTEMA CRM</div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(sec => (
          <React.Fragment key={sec}>
            <div className="sidebar-section-label">{sec}</div>
            {NAV.filter(n => n.section === sec).map(n => (
              <button
                key={n.id}
                className={`nav-item ${current === n.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrent(n.id)
                  setIsOpen(false)
                }}
              >
                {n.label}
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ padding: '20px 12px', borderTop: '1px solid var(--border)' }}>
        <button 
          onClick={toggleTheme} 
          style={{ width: '100%', marginBottom: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px' }}
        >
          {isDark ? 'Modo Claro' : 'Modo Oscuro'}
        </button>

        <div className="user-chip" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="user-avatar" style={{ width: '32px', height: '32px', background: 'var(--accent)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>⏻</button>
        </div>
      </div>
    </aside>
  )
}

function AppLayout() {
  const { user, loading } = useAuth()
  const [current, setCurrent] = React.useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <div className="app-layout">
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>☰</button>
        <div className="brand-text" style={{ fontSize: '14px' }}>Mantenizapp</div>
        <div style={{ width: '24px' }}></div> {/* Spacer to center text */}
      </header>

      <Sidebar 
        current={current} 
        setCurrent={setCurrent} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      
      <main className="main-content">
        {current === 'dashboard' && <DashboardPage />}
        {current === 'clientes' && <ClientesPage />}
        {current === 'presupuestos' && <PresupuestosPage />}
        {current === 'informes' && <InformesPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  )
}