import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ClientesPage from './pages/ClientesPage'
import PresupuestosPage from './pages/PresupuestosPage'
import InformesPage from './pages/InformesPage'
import './index.css'

// LOGO HEXAGONAL 3D (Idéntico al del Mockup)
function MantenizappLogo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transition: 'transform 0.3s ease' }}>
      {/* Hexágono exterior azul marino */}
      <polygon points="50,5 93,30 93,80 50,95 7,80 7,30" fill="#0b2149" />
      {/* Pliegue superior del M (naranja brillante) */}
      <polygon points="50,15 83,34 50,53 17,34" fill="#f97316" />
      {/* Columna derecha del M (naranja oscuro) */}
      <polygon points="50,53 73,40 73,78 50,90" fill="#ea580c" />
      {/* Columna izquierda del M (ámbar/dorado) */}
      <polygon points="50,53 27,40 27,78 50,90" fill="#e28a2b" />
      {/* Brillo tridimensional */}
      <polygon points="50,53 73,40 50,30 27,40" fill="#ffffff" opacity="0.15" />
    </svg>
  )
}

const NAV = [
  { id: 'dashboard', label: 'Inicio', icon: 'home', section: 'PRINCIPAL' },
  { id: 'clientes', label: 'Clientes', icon: 'clipboard', section: 'GESTIÓN' },
  { id: 'presupuestos', label: 'Presupuestos', icon: 'briefcase', section: 'GESTIÓN' },
  { id: 'informes', label: 'Informes', icon: 'calendar', section: 'GESTIÓN' },
  { id: 'perfil', label: 'Perfil', icon: 'user', section: 'SISTEMA' }
]

function getIcon(name, active) {
  const color = active ? 'var(--accent)' : 'currentColor'
  const strokeW = active ? '2.8' : '2.2'

  switch (name) {
    case 'home':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'clipboard':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M9 8h6"/></svg>
    case 'briefcase':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2H2a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a1 1 0 0 0-1-1h-6V3a1 1 0 0 0-1-1z"/><path d="M8 5h8"/></svg>
    case 'calendar':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
    case 'user':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    default:
      return null
  }
}

function Sidebar({ current, setCurrent }) {
  const { user, signOut } = useAuth()
  const sections = [...new Set(NAV.filter(n => n.id !== 'perfil').map(n => n.section))]
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
    <aside className="sidebar">
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px 24px' }}>
        <MantenizappLogo size={36} />
        <div>
          <div className="brand-text" style={{ fontSize: '18px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Mantenizapp</div>
          <div className="brand-sub" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gestión Activos</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(sec => (
          <React.Fragment key={sec}>
            <div className="sidebar-section-label">{sec}</div>
            {NAV.filter(n => n.section === sec).map(n => (
              <button
                key={n.id}
                className={`nav-item ${current === n.id ? 'active' : ''}`}
                onClick={() => setCurrent(n.id)}
              >
                {getIcon(n.icon, current === n.id)}
                <span>{n.label}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ padding: '20px 16px', borderTop: '1px solid var(--border)' }}>
        <button 
          onClick={toggleTheme} 
          style={{ width: '100%', marginBottom: '16px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
        </button>

        <div className="user-chip" style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setCurrent('perfil')}>
          <div className="user-avatar" style={{ width: '36px', height: '36px', background: 'var(--accent)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis' }}>Técnico</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); signOut(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

function PerfilPage() {
  const { user, signOut } = useAuth()
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
    <div>
      <div className="page-header">
        <h1 className="page-title">Mi Perfil</h1>
        <p className="page-sub">Configuración de cuenta y sistema</p>
      </div>

      <div className="card" style={{ maxWidth: 500, margin: '20px auto 0', textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ width: 80, height: 80, background: 'var(--accent)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 'bold', margin: '0 auto 20px', boxShadow: '0 4px 12px var(--accent-soft)' }}>
          {initials}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Técnico Autorizado</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>{user?.email}</p>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'left', marginBottom: 28 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Preferencias del sistema</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Modo Oscuro</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cambiar apariencia visual</div>
            </div>
            <button className="btn btn-secondary" onClick={toggleTheme} style={{ padding: '8px 16px', fontSize: '13px' }}>
              {isDark ? '☀️ Claro' : '🌙 Oscuro'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Plataforma Mantenizapp</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Versión móvil y web optimizada</div>
            </div>
            <span className="badge badge-blue">v2.1.0</span>
          </div>
        </div>

        <button className="btn btn-primary" onClick={signOut} style={{ width: '100%', justifyContent: 'center', background: 'var(--danger)', border: 'none', color: '#fff' }}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  )
}

function AppLayout() {
  const { user, loading } = useAuth()
  const [current, setCurrent] = React.useState('dashboard')

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
      {/* CABECERA MÓVIL EXACTA AL MOCKUP */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MantenizappLogo size={32} />
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#0b2149', letterSpacing: '-0.02em' }}>Mantenizapp</span>
        </div>
        <div className="notification-bell">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0b2149" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span className="notification-badge"></span>
        </div>
      </header>

      {/* SIDEBAR ESCRITORIO */}
      <Sidebar current={current} setCurrent={setCurrent} />
      
      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content">
        {current === 'dashboard' && <DashboardPage />}
        {current === 'clientes' && <ClientesPage />}
        {current === 'presupuestos' && <PresupuestosPage />}
        {current === 'informes' && <InformesPage />}
        {current === 'perfil' && <PerfilPage />}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (BOTTOM NAV) DE MÓVIL EXACTA AL MOCKUP */}
      <nav className="bottom-nav">
        {NAV.map(n => {
          const isActive = current === n.id
          return (
            <button
              key={n.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrent(n.id)}
            >
              <div className={`nav-icon-container ${isActive ? 'active' : ''}`}>
                {n.id === 'dashboard' ? <MantenizappLogo size={22} /> : getIcon(n.icon, isActive)}
              </div>
              <span className="bottom-nav-label">{n.label}</span>
            </button>
          )
        })}
      </nav>
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