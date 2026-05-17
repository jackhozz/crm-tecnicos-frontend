import React from 'react'
import { supabase } from './supabase'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import AgendaPage from './pages/AgendaPage'
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
  { id: 'agenda', label: 'Agenda', icon: 'calendar', section: 'PRINCIPAL' },
  { id: 'clientes', label: 'Clientes', icon: 'clipboard', section: 'GESTIÓN' },
  { id: 'presupuestos', label: 'Presupuestos', icon: 'briefcase', section: 'DOCUMENTOS' },
  { id: 'informes', label: 'Informes', icon: 'file-text', section: 'DOCUMENTOS' },
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
    case 'file-text':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
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
      <div className="sidebar-brand" style={{ padding: '8px 24px 20px', borderBottom: '1px solid var(--border)', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
        <img src="/isologotipo.png" alt="Mantenizapp Logo" style={{ height: '48px', maxWidth: '100%', objectFit: 'contain' }} />
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
          {isDark ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <span>Modo Oscuro</span>
            </>
          )}
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
  const [profileForm, setProfileForm] = React.useState({
    nombre: '',
    apellido: '',
    documentoIdentidad: '',
    gradoProfesion: '',
    competencias: '',
    telefono: '',
    correoProfesional: ''
  })
  const [fetching, setFetching] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState(null)

  React.useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    setFetching(true)
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setProfileForm({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          documentoIdentidad: data.documento_identidad || '',
          gradoProfesion: data.grado_profesion || '',
          competencias: data.competencias || '',
          telefono: data.telefono || '',
          correoProfesional: data.correo_profesional || ''
        })
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err)
    } finally {
      setFetching(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const { error } = await supabase.from('perfiles').upsert({
        id: user.id,
        nombre: profileForm.nombre,
        apellido: profileForm.apellido,
        documento_identidad: profileForm.documentoIdentidad,
        grado_profesion: profileForm.gradoProfesion,
        competencias: profileForm.competencias,
        telefono: profileForm.telefono,
        correo_profesional: profileForm.correoProfesional,
        updated_at: new Date()
      })
      if (error) throw error
      setMsg({ type: 'success', text: 'Perfil actualizado con éxito.' })
    } catch (err) {
      console.error('Error al guardar perfil:', err)
      setMsg({ type: 'error', text: err.message || 'Error al guardar.' })
    } finally {
      setSaving(false)
    }
  }

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
        <p className="page-sub">Completa tus datos profesionales para personalizar tus mensajes y documentos técnicos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '20px' }}>
        {/* LADO IZQUIERDO: Tarjeta Resumen y Preferencias */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: 80, height: 80, background: 'var(--accent)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 'bold', margin: '0 auto 16px', boxShadow: '0 4px 12px var(--accent-soft)' }}>
              {profileForm.nombre ? (profileForm.nombre[0] + (profileForm.apellido ? profileForm.apellido[0] : '')).toUpperCase() : initials}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
              {profileForm.nombre ? `${profileForm.nombre} ${profileForm.apellido}` : 'Técnico Especialista'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{profileForm.gradoProfesion || 'Perfil no completado'}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{user?.email}</p>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'left', marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Preferencias del sistema</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Modo Oscuro</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cambiar apariencia visual</div>
              </div>
              <button className="btn btn-secondary" onClick={toggleTheme} style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isDark ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    <span>Claro</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    <span>Oscuro</span>
                  </>
                )}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Guía de Inicio</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Volver a ver el tutorial interactivo</div>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  localStorage.removeItem('mantenizapp_walkthrough_completed')
                  window.location.reload()
                }} 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                📖 Iniciar
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Notificación de Prueba</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Probar alertas nativas de fondo</div>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={async () => {
                  if (!('Notification' in window)) {
                    alert('Este navegador no soporta notificaciones de escritorio.')
                    return
                  }
                  
                  let permission = Notification.permission
                  if (permission === 'default') {
                    permission = await Notification.requestPermission()
                  }
                  
                  if (permission === 'granted') {
                    if ('serviceWorker' in navigator) {
                      try {
                        const reg = await navigator.serviceWorker.ready
                        await reg.showNotification('🚀 Prueba de Mantenizapp', {
                          body: '¡Excelente! Las notificaciones nativas de segundo plano están funcionando perfectamente en tu dispositivo.',
                          icon: '/logo.png',
                          badge: '/logo.png',
                          vibrate: [200, 100, 200]
                        })
                      } catch (err) {
                        new Notification('🚀 Prueba de Mantenizapp', {
                          body: '¡Excelente! Las notificaciones nativas de primer plano están funcionando.',
                          icon: '/logo.png'
                        })
                      }
                    } else {
                      new Notification('🚀 Prueba de Mantenizapp', {
                        body: '¡Excelente! Las notificaciones nativas de primer plano están funcionando.',
                        icon: '/logo.png'
                      })
                    }
                  } else {
                    alert('Permiso de notificaciones denegado. Por favor, actívalas en la barra de direcciones de tu navegador.')
                  }
                }} 
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                🔔 Probar
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Plataforma Profesional</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mantenizapp Core Engine</div>
              </div>
              <span className="badge badge-blue" style={{ fontSize: '10px', padding: '2px 6px' }}>v2.1.0</span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={signOut} style={{ width: '100%', justifyContent: 'center', background: 'var(--danger)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: '700', padding: '10px' }}>
            Cerrar Sesión
          </button>
        </div>

        {/* LADO DERECHO: Formulario de Datos Profesionales */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Datos Profesionales
          </h3>

          {msg && (
            <div 
              className={msg.type === 'success' ? 'auth-success' : 'auth-error'} 
              style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}
            >
              {msg.text}
            </div>
          )}

          {fetching ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <span className="spinner" />
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nombre *</label>
                  <input 
                    className="form-input" 
                    placeholder="Tu nombre" 
                    value={profileForm.nombre} 
                    onChange={e => setProfileForm(f => ({ ...f, nombre: e.target.value }))} 
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Apellido *</label>
                  <input 
                    className="form-input" 
                    placeholder="Tu apellido" 
                    value={profileForm.apellido} 
                    onChange={e => setProfileForm(f => ({ ...f, apellido: e.target.value }))} 
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Documento de Identidad (Cédula/DNI)</label>
                <input 
                  className="form-input" 
                  placeholder="Ej: V-12345678" 
                  value={profileForm.documentoIdentidad} 
                  onChange={e => setProfileForm(f => ({ ...f, documentoIdentidad: e.target.value }))} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Grado Académico o Profesión</label>
                <input 
                  className="form-input" 
                  placeholder="Ej: Técnico de Climatización Superior" 
                  value={profileForm.gradoProfesion} 
                  onChange={e => setProfileForm(f => ({ ...f, gradoProfesion: e.target.value }))} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Teléfono Profesional</label>
                <input 
                  className="form-input" 
                  placeholder="Ej: +584120000000" 
                  value={profileForm.telefono} 
                  onChange={e => setProfileForm(f => ({ ...f, telefono: e.target.value }))} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Correo Profesional</label>
                <input 
                  className="form-input" 
                  type="email"
                  placeholder="Tu correo de contacto" 
                  value={profileForm.correoProfesional} 
                  onChange={e => setProfileForm(f => ({ ...f, correoProfesional: e.target.value }))} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Competencias y Especialidades</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  placeholder="Ej: Mantenimiento VRF, sistemas chiller, electricidad y controles de automatización." 
                  value={profileForm.competencias} 
                  onChange={e => setProfileForm(f => ({ ...f, competencias: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving} 
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '10px', fontSize: '13px', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {saving ? <span className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
                )}
                {saving ? 'Guardando cambios...' : 'Guardar Perfil'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileCompletionOverlay({ user, onComplete }) {
  const [form, setForm] = React.useState({
    nombre: '',
    apellido: '',
    documentoIdentidad: '',
    gradoProfesion: '',
    telefono: '',
    competencias: ''
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError('El nombre y apellido son obligatorios.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase
        .from('perfiles')
        .upsert({
          id: user.id,
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          documento_identidad: form.documentoIdentidad.trim(),
          grado_profesion: form.gradoProfesion.trim(),
          telefono: form.telefono.trim(),
          correo_profesional: user.email,
          competencias: form.competencias.trim(),
          updated_at: new Date()
        })
      
      if (error) throw error
      onComplete()
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Error al guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-completion-overlay">
      <div className="profile-completion-card">
        <div className="profile-completion-header">
          <div className="profile-completion-logo-wrapper">
            <img src="/logo.png" alt="Mantenizapp" className="profile-completion-logo" />
          </div>
          <h2>Bienvenido a Mantenizapp</h2>
          <p className="profile-completion-intro">
            Para comenzar, completemos tu perfil profesional técnico. Estos datos son muy importantes porque **se usarán automáticamente para rellenar y firmar de manera formal todos tus presupuestos, informes técnicos y documentos de servicio**, ahorrándote valioso tiempo de escritura manual.
          </p>
        </div>

        {error && (
          <div className="auth-error" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nombre *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Juan"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Apellido *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Pérez"
                value={form.apellido}
                onChange={e => setForm({ ...form, apellido: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Documento de Identidad (Cédula/DNI)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: V-12345678"
              value={form.documentoIdentidad}
              onChange={e => setForm({ ...form, documentoIdentidad: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Grado Académico o Profesión</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: Técnico Frigorista Superior"
              value={form.gradoProfesion}
              onChange={e => setForm({ ...form, gradoProfesion: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Teléfono de Contacto</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: +58 412 1234567"
              value={form.telefono}
              onChange={e => setForm({ ...form, telefono: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Especialidades / Competencias</label>
            <textarea
              className="form-textarea"
              placeholder="Ej: Sistemas de climatización comercial, chillers, refrigeración industrial..."
              value={form.competencias}
              onChange={e => setForm({ ...form, competencias: e.target.value })}
              rows={2}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', height: '42px', fontWeight: 'bold' }} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Guardar perfil y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function WalkthroughTour({ onClose }) {
  const [step, setStep] = React.useState(0)

  const steps = [
    {
      title: 'El Dashboard (Métricas y Control)',
      desc: 'Bienvenido al panel principal de Mantenizapp. Aquí verás de un vistazo el resumen diario de tus clientes atendidos, equipos en monitoreo y los servicios programados para el día de hoy con sus respectivas horas.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop'
    },
    {
      title: 'Clientes y Directorio Técnico',
      desc: 'En esta sección podrás registrar la base de datos de tus clientes y vincularles sus aires acondicionados, cavas o sistemas industriales. Podrás definir su marca, modelo, serial y cuándo les corresponde su próximo mantenimiento preventivo.',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=400&auto=format&fit=crop'
    },
    {
      title: 'Agenda y Calendario Inteligente',
      desc: 'Planifica y organiza tus visitas técnicas reales. Mantenizapp diferencia de forma única e inteligente la fecha programada de tu visita física de la fecha de recomendación técnica del próximo mantenimiento preventivo automático (ej: cada 3 meses).',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=400&auto=format&fit=crop'
    },
    {
      title: 'Informes Técnicos con Inteligencia Artificial',
      desc: 'Redacta diagnósticos, listas de repuestos e informes de servicio ultra-profesionales. Ahorra tiempo ingresando ideas cortas y dejando que la IA de Gemini autocomplete todos los campos de redacción formal con un solo clic.',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=400&auto=format&fit=crop'
    },
    {
      title: 'Presupuestos y Plantillas (Duplicar)',
      desc: 'Genera cotizaciones en PDF, edita precios e ítems al instante, y usa presupuestos previos como plantillas rápidas presionando "Duplicar". Modifica solo lo que necesites y guarda para crear un nuevo presupuesto en segundos.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=400&auto=format&fit=crop'
    }
  ]

  const currentStep = steps[step]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem('mantenizapp_walkthrough_completed', 'true')
      onClose()
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  return (
    <div className="walkthrough-overlay">
      <div className="walkthrough-card">
        <button className="walkthrough-close-btn" onClick={() => {
          localStorage.setItem('mantenizapp_walkthrough_completed', 'true')
          onClose()
        }}>✕</button>

        <div className="walkthrough-progress-bar">
          <div className="walkthrough-progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="walkthrough-content">
          <div className="walkthrough-image-container">
            <img src={currentStep.image} alt={currentStep.title} className="walkthrough-image" />
            <div className="walkthrough-badge">Paso {step + 1} de {steps.length}</div>
          </div>
          
          <div className="walkthrough-text">
            <h3>{currentStep.title}</h3>
            <p>{currentStep.desc}</p>
          </div>
        </div>

        <div className="walkthrough-actions">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handlePrev} 
            disabled={step === 0}
            style={{ minWidth: '80px', margin: 0 }}
          >
            Anterior
          </button>
          <div className="walkthrough-dots">
            {steps.map((_, idx) => (
              <span key={idx} className={`walkthrough-dot ${idx === step ? 'active' : ''}`} onClick={() => setStep(idx)} />
            ))}
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleNext}
            style={{ minWidth: '100px', margin: 0, fontWeight: 'bold' }}
          >
            {step === steps.length - 1 ? 'Comenzar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function AppLayout() {
  const { user, loading } = useAuth()
  const [current, setCurrent] = React.useState('dashboard')
  const [notifications, setNotifications] = React.useState([])
  const [showNotifDrawer, setShowNotifDrawer] = React.useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const [profileComplete, setProfileComplete] = React.useState(true)
  const [profileChecking, setProfileChecking] = React.useState(true)
  const [showWalkthrough, setShowWalkthrough] = React.useState(false)

  const subscribeUserToPush = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        const VAPID_PUBLIC_KEY = 'BI5xJ5tP6t7_U_gZ8q7uWqK79U_xO0lX9g1rD6U-6zK1f69_q1Z8Q_6O0X9-G0X9G0X9G0X9G0X9G0X9G0X9G0X9A'
        
        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          })
        }
        
        if (subscription) {
          await supabase
            .from('push_subscriptions')
            .upsert({
              user_id: user.id,
              subscription: subscription.toJSON(),
              updated_at: new Date()
            }, { onConflict: 'user_id, subscription' })
        }
      }
    } catch (err) {
      console.warn('Error registrando suscripción push en Supabase:', err)
    }
  }

  React.useEffect(() => {
    if (!user) {
      setProfileChecking(false)
      return
    }

    const checkProfileAndWalkthrough = async () => {
      setProfileChecking(true)
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('nombre, apellido')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        if (!data || !data.nombre || !data.apellido) {
          setProfileComplete(false)
        } else {
          setProfileComplete(true)
          const completed = localStorage.getItem('mantenizapp_walkthrough_completed')
          if (completed !== 'true') {
            setShowWalkthrough(true)
          }
        }
      } catch (err) {
        console.error('Error checking profile status:', err)
      } finally {
        setProfileChecking(false)
      }
    }

    checkProfileAndWalkthrough()
  }, [user])

  React.useEffect(() => {
    if (!user) return

    // Solicitar permisos de notificación push nativos y registrar suscripción de fondo
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            subscribeUserToPush()
          }
        })
      } else if (Notification.permission === 'granted') {
        subscribeUserToPush()
      }
    }

    const scanNotifications = async () => {
      try {
        const { data: listEquipos, error: eqErr } = await supabase
          .from('equipos')
          .select('*, clientes(nombre)')
        
        const { data: listAgenda, error: agErr } = await supabase
          .from('agenda')
          .select('*, equipos(nombre, clientes(nombre))')

        const generatedNotifs = []
        const todayStr = new Date().toISOString().split('T')[0]

        // A. Escanear equipos para mantenimiento preventivo próximo (próximos 7 días)
        if (listEquipos && !eqErr) {
          listEquipos.forEach(eq => {
            if (eq.proximo_mantenimiento) {
              const pDate = new Date(eq.proximo_mantenimiento)
              const diffTime = pDate - new Date()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

              if (diffDays >= -30 && diffDays <= 7) {
                generatedNotifs.push({
                  id: `eq-${eq.id}-${eq.proximo_mantenimiento}`,
                  title: '⚠️ Mantenimiento Próximo',
                  desc: `El equipo "${eq.nombre || eq.tipo}" de "${eq.clientes?.nombre || 'Cliente'}" requiere mantenimiento pronto (${eq.proximo_mantenimiento}).`,
                  time: diffDays < 0 ? 'Vencido' : `En ${diffDays} días`,
                  read: false,
                  target: 'clientes'
                })
              }
            }
          })
        }

        // B. Escanear citas agendadas de hoy
        if (listAgenda && !agErr) {
          listAgenda.forEach(ag => {
            if (ag.fecha === todayStr) {
              generatedNotifs.push({
                id: `ag-${ag.id}`,
                title: '📅 Cita Agendada Hoy',
                desc: `Tienes un mantenimiento programado hoy a las ${ag.hora || 'hora no especificada'} para el equipo "${ag.equipos?.nombre || 'Equipo'}"`,
                time: `${ag.hora || 'Hoy'}`,
                read: false,
                target: 'agenda'
              })
            }
          })
        }

        // C. Escanear estado del perfil
        const { data: profile } = await supabase
          .from('perfiles')
          .select('nombre')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile || !profile.nombre) {
          generatedNotifs.push({
            id: 'profile-tip',
            title: '✨ Completa tu Perfil',
            desc: 'Registra tu nombre, apellido y especialidades en Perfil para personalizar tus documentos técnicos y mensajes.',
            time: 'Sugerencia',
            read: false,
            target: 'perfil'
          })
        }

        // D. Escanear tareas sin completar de prioridad Alta de la tabla 'todos'
        try {
          const { data: listTodos, error: todoErr } = await supabase
            .from('todos')
            .select('*')
            .eq('completed', false)
            .eq('priority', 'Alta')

          if (listTodos && !todoErr) {
            listTodos.forEach(todo => {
              generatedNotifs.push({
                id: `todo-${todo.id}`,
                title: '📌 Tarea Pendiente Urgente',
                desc: `Recordatorio: Tienes pendiente la tarea "${todo.text}".`,
                time: 'Urgente',
                read: false,
                target: 'dashboard'
              })
            })
          }
        } catch (err) {
          console.warn('Error escaneando tareas para notificaciones:', err)
        }

        if (generatedNotifs.length === 0) {
          generatedNotifs.push({
            id: 'welcome',
            title: '🚀 ¡Mantenizapp Activo!',
            desc: 'El sistema de notificaciones está monitoreando tus próximos servicios preventivos en tiempo real.',
            time: 'Ahora',
            read: true,
            target: 'dashboard'
          })
        }

        setNotifications(generatedNotifs)

        // Disparar Notificación Push nativa del navegador para el dispositivo activo
        const activeUnread = generatedNotifs.filter(n => !n.read)
        if (activeUnread.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
          const criticalNotif = activeUnread[0]
          new Notification(criticalNotif.title, {
            body: criticalNotif.desc,
            icon: '/logo.png'
          })
        }

      } catch (err) {
        console.error('Error scanning notifications:', err)
      }
    }

    scanNotifications()
    const interval = setInterval(scanNotifications, 60000)
    return () => clearInterval(interval)
  }, [user])

  if (loading || (user && profileChecking)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', gap: '16px' }}>
        <img src="/carga.gif" alt="Cargando Mantenizapp..." style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
        <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', letterSpacing: '-0.02em', opacity: 0.8 }}>
          Iniciando Mantenizapp...
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  if (!profileComplete) {
    return (
      <ProfileCompletionOverlay 
        user={user} 
        onComplete={() => {
          setProfileComplete(true)
          const completed = localStorage.getItem('mantenizapp_walkthrough_completed')
          if (completed !== 'true') {
            setShowWalkthrough(true)
          }
        }} 
      />
    )
  }

  return (
    <div className="app-layout">
      {/* CABECERA MÓVIL EXACTA AL MOCKUP CON LOGO MEJORADO Y GRANDE */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Mantenizapp Logo" style={{ height: '36px', objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.03em', fontFamily: 'inherit' }}>Mantenizapp</span>
        </div>
        <div className="notification-bell" onClick={() => setShowNotifDrawer(!showNotifDrawer)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          {unreadCount > 0 && <span className="notification-badge"></span>}
        </div>
      </header>

      {/* NOTIFICATIONS DRAWER DESPLEGABLE PREMIUM */}
      {showNotifDrawer && (
        <>
          <div className="notifications-drawer-overlay" onClick={() => setShowNotifDrawer(false)} />
          <div className="notifications-drawer">
            <div className="notifications-header">
              <h3>Notificaciones</h3>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                }}
                style={{ fontSize: '10px', padding: '4px 8px', height: 'auto', minWidth: 'auto', margin: 0 }}
              >
                Marcar leídas
              </button>
            </div>
            <div className="notifications-body">
              {notifications.length === 0 ? (
                <div className="notifications-empty">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span>No tienes alertas pendientes</span>
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => {
                      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
                      setCurrent(n.target)
                      setShowNotifDrawer(false)
                    }}
                  >
                    <div className="notification-icon-wrapper">
                      {n.title.includes('Mantenimiento') ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      ) : n.title.includes('Cita') ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      )}
                    </div>
                    <div className="notification-info">
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-desc">{n.desc}</div>
                      <div className="notification-time">{n.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* SIDEBAR ESCRITORIO */}
      <Sidebar current={current} setCurrent={setCurrent} />
      
      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content">
        {current === 'dashboard' && <DashboardPage setCurrent={setCurrent} />}
        {current === 'agenda' && <AgendaPage />}
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
                {n.id === 'dashboard' ? <img src="/logo.png" alt="Inicio" style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> : getIcon(n.icon, isActive)}
              </div>
              <span className="bottom-nav-label">{n.label}</span>
            </button>
          )
        })}
      </nav>
      {showWalkthrough && (
        <WalkthroughTour onClose={() => setShowWalkthrough(false)} />
      )}
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