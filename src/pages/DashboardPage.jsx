import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    clientesCount: 0,
    equiposCount: 0,
    estaSemanaCount: 0,
    atrasadosCount: 0,
  })
  const [atrasados, setAtrasados] = useState([])
  const [showQuickModal, setShowQuickModal] = useState(false)
  const [quickForm, setQuickForm] = useState({ type: '', nombre: '', telefono: '', correo: '', tipo: 'Cliente' })
  const [savingQuick, setSavingQuick] = useState(false)
  const [quickMsg, setQuickMsg] = useState(null)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const { data: clientes, error: clientesErr } = await supabase
        .from('clientes')
        .select('*')

      if (clientesErr) throw clientesErr

      const clientesIds = (clientes || []).map(c => c.id)

      if (clientesIds.length === 0) {
        setStats({
          clientesCount: 0,
          equiposCount: 0,
          estaSemanaCount: 0,
          atrasadosCount: 0,
        })
        setAtrasados([])
        setLoading(false)
        return
      }

      const { data: equipos, error: equiposErr } = await supabase
        .from('equipos')
        .select('*, clientes(*)')
        .in('cliente_id', clientesIds)

      if (equiposErr) throw equiposErr

      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const atrasadosList = []
      let estaSemanaCount = 0

      ;(equipos || []).forEach(eq => {
        if (!eq.proximo_mantenimiento) return

        const dateParts = eq.proximo_mantenimiento.split('-')
        const fechaProx = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
        fechaProx.setHours(0, 0, 0, 0)

        if (fechaProx < hoy) {
          atrasadosList.push(eq)
        } else {
          const diffDays = (fechaProx - hoy) / 86400000
          if (diffDays >= 0 && diffDays <= 7) {
            estaSemanaCount++
          }
        }
      })

      setStats({
        clientesCount: clientes.length,
        equiposCount: equipos.length,
        estaSemanaCount,
        atrasadosCount: atrasadosList.length,
      })
      setAtrasados(atrasadosList)
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateQuickClient = async () => {
    if (!quickForm.nombre) {
      setQuickMsg('Escribe el nombre del cliente')
      return
    }
    setSavingQuick(true)
    const { error } = await supabase.from('clientes').insert({
      nombre: quickForm.nombre,
      telefono: quickForm.telefono || '',
      correo: quickForm.correo || '',
      user_id: user.id
    })

    if (error) {
      setQuickMsg(error.message)
    } else {
      setQuickMsg(null)
      setShowQuickModal(false)
      setQuickForm({ type: '', nombre: '', telefono: '', correo: '', tipo: 'Cliente' })
      loadDashboardData()
    }
    setSavingQuick(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <div>
      {/* HEADER EXACTO AL MOCKUP (con nombre de página) */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '28px', fontWeight: '850', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Dashboard</h1>
        <p className="page-sub" style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>
          {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* SECCIÓN 1: Tareas de Mantenimiento Hoy */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px', letterSpacing: '-0.01em' }}>
          Tareas de Mantenimiento Hoy
        </h2>
        <div className="today-tasks-slider">
          {/* MOCK/DYNAMIC CARD 1 */}
          <div className="task-card-mock">
            <div className="task-icon-box" style={{ background: '#ffedd5', color: '#f97316' }}>🔧</div>
            <div>
              <div className="task-title-mock">Revisión de Caldera</div>
              <div className="task-time-mock" style={{ marginTop: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                2 PM
              </div>
            </div>
            <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', fontSize: '18px', fontWeight: 'bold' }}>⋮</div>
          </div>

          {/* MOCK/DYNAMIC CARD 2 */}
          <div className="task-card-mock">
            <div className="task-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>💨</div>
            <div>
              <div className="task-title-mock">Cambiar Filtro de Aire</div>
              <div className="task-time-mock" style={{ marginTop: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                4 PM
              </div>
            </div>
            <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', fontSize: '18px', fontWeight: 'bold' }}>⋮</div>
          </div>

          {/* Si hay mantenimientos atrasados, agregarlos dinámicamente como tareas urgentes */}
          {atrasados.slice(0, 3).map((eq, i) => (
            <div key={eq.id} className="task-card-mock" style={{ borderLeft: '3px solid var(--danger)' }}>
              <div className="task-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>⚠️</div>
              <div>
                <div className="task-title-mock" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{eq.nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{eq.clientes?.nombre}</div>
                <div className="task-time-mock" style={{ marginTop: '8px', color: 'var(--danger)' }}>
                  Atrasado
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: Mis Propiedades (Directorio y Activos) */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px', letterSpacing: '-0.01em' }}>
          Mis Propiedades
        </h2>
        <div className="grid-2">
          {/* Card 1: Clientes */}
          <div className="property-card-mock">
            <div className="property-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>🏠</div>
            <div className="property-info">
              <div className="property-title-mock">Mis Propiedades</div>
              <div className="property-tasks-mock">{stats.clientesCount} Clientes Registrados</div>
            </div>
            {/* Orange warning alert badge */}
            <div style={{ width: '18px', height: '18px', background: '#f97316', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>!</div>
          </div>

          {/* Card 2: Equipos */}
          <div className="property-card-mock">
            <div className="property-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>🚗</div>
            <div className="property-info">
              <div className="property-title-mock">Flota de Vehículos</div>
              <div className="property-tasks-mock">{stats.equiposCount} Equipos Activos</div>
            </div>
            {/* Green checkmark badge */}
            <div style={{ width: '18px', height: '18px', background: '#22c55e', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>✓</div>
          </div>
        </div>
      </div>

      {/* BOTÓN FLOTANTE (FAB) DE AÑADIR NUEVA TAREA */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', marginBottom: '20px' }}>
        <button className="fab-capsule" onClick={() => setShowQuickModal(true)}>
          <span>Añadir Nueva Tarea</span>
          <span className="fab-plus">+</span>
        </button>
      </div>

      {/* TABLA DE ATENCIÓN URGENTE */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>Equipos con atención urgente</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Mantenimientos atrasados</div>
          </div>
          {stats.atrasadosCount > 0 && <span className="badge" style={{ background: '#fee2e2', color: '#ef4444', fontWeight: 700 }}>{stats.atrasadosCount} alertas</span>}
        </div>

        {atrasados.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px', fontWeight: 500 }}>
            ✨ Todo al día. Sin mantenimientos atrasados.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipo / Cliente</th>
                  <th>Marca / Modelo</th>
                  <th>Fecha programada</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {atrasados.map(eq => {
                  const cliente = eq.clientes
                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>{eq.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{cliente?.nombre}</div>
                      </td>
                      <td style={{ fontSize: '13px' }}>{eq.marca || '—'} · {eq.modelo || '—'}</td>
                      <td>
                        <span className="badge" style={{ background: '#fee2e2', color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
                          {eq.proximo_mantenimiento}
                        </span>
                      </td>
                      <td>
                        {cliente?.telefono && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--success)', padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => window.open(`https://wa.me/${cliente.telefono}?text=Hola ${cliente.nombre}, le contactamos para programar el mantenimiento de su equipo ${eq.nombre} (${eq.marca || ''}).`, '_blank')}
                          >
                            WhatsApp
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK ADD MODAL OVERLAY */}
      {showQuickModal && (
        <div className="modal-overlay" onClick={() => setShowQuickModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Añadir Nuevo</h3>
              <button onClick={() => setShowQuickModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {quickForm.type === '' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setQuickForm(f => ({ ...f, type: 'cliente' }))} style={{ width: '100%', justifyContent: 'flex-start', padding: 16 }}>
                  🏢 Registrar Nuevo Cliente
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 4 }}>
                  * Nota: Para registrar un equipo, presupuesto o informe técnico, dirígete a las pestañas correspondientes en la barra de navegación.
                </div>
              </div>
            ) : (
              <div>
                {quickMsg && <div className="auth-error" style={{ marginBottom: 16 }}>{quickMsg}</div>}
                
                <div className="form-group">
                  <label className="form-label">Nombre del Cliente *</label>
                  <input className="form-input" placeholder="Ej: Inversiones Caribe C.A." value={quickForm.nombre} onChange={e => setQuickForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono de Contacto</label>
                  <input className="form-input" placeholder="Ej: +584120000000" value={quickForm.telefono} onChange={e => setQuickForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico</label>
                  <input className="form-input" type="email" placeholder="Ej: cliente@correo.com" value={quickForm.correo} onChange={e => setQuickForm(f => ({ ...f, correo: e.target.value }))} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="btn btn-primary" onClick={handleCreateQuickClient} disabled={savingQuick} style={{ flex: 1 }}>
                    {savingQuick ? <span className="spinner" /> : '💾'}
                    {savingQuick ? 'Guardando...' : 'Guardar Cliente'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setQuickForm(f => ({ ...f, type: '' }))} disabled={savingQuick}>
                    Atrás
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
