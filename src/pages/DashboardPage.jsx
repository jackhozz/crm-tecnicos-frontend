import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage({ setCurrent }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [clientesList, setClientesList] = useState([])
  const [equiposList, setEquiposList] = useState([])
  const [searchClient, setSearchClient] = useState('')
  const [schedulingEquipo, setSchedulingEquipo] = useState(null)
  const [newScheduleDate, setNewScheduleDate] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState(null)
  const [stats, setStats] = useState({
    clientesCount: 0,
    equiposCount: 0,
    estaSemanaCount: 0,
    atrasadosCount: 0,
  })
  const [hoyList, setHoyList] = useState([])
  const [semanaList, setSemanaList] = useState([])
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

  const getTodayString = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const { data: clientes, error: clientesErr } = await supabase
        .from('clientes')
        .select('*')

      if (clientesErr) throw clientesErr

      setClientesList(clientes || [])
      const clientesIds = (clientes || []).map(c => c.id)

      if (clientesIds.length === 0) {
        setClientesList([])
        setEquiposList([])
        setStats({
          clientesCount: 0,
          equiposCount: 0,
          estaSemanaCount: 0,
          atrasadosCount: 0,
        })
        setHoyList([])
        setSemanaList([])
        setAtrasados([])
        setLoading(false)
        return
      }

      const { data: equipos, error: equiposErr } = await supabase
        .from('equipos')
        .select('*, clientes(*)')
        .in('cliente_id', clientesIds)

      if (equiposErr) throw equiposErr

      const todayStr = getTodayString()
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const realHoyList = []
      const realSemanaList = []
      const realAtrasadosList = []

      ;(equipos || []).forEach(eq => {
        if (!eq.proximo_mantenimiento) return

        if (eq.proximo_mantenimiento === todayStr) {
          realHoyList.push(eq)
        } else {
          const dateParts = eq.proximo_mantenimiento.split('-')
          const fechaProx = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
          fechaProx.setHours(0, 0, 0, 0)

          if (fechaProx < hoy) {
            realAtrasadosList.push(eq)
          } else {
            const diffDays = (fechaProx - hoy) / 86400000
            if (diffDays > 0 && diffDays <= 7) {
              realSemanaList.push(eq)
            }
          }
        }
      })

      setStats({
        clientesCount: clientes.length,
        equiposCount: equipos.length,
        estaSemanaCount: realHoyList.length + realSemanaList.length,
        atrasadosCount: realAtrasadosList.length,
      })
      setEquiposList(equipos || [])
      setHoyList(realHoyList)
      setSemanaList(realSemanaList)
      setAtrasados(realAtrasadosList)
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err)
    } finally {
      // Retrasar levemente la carga para lucir la preciosa animación gif
      setTimeout(() => {
        setLoading(false)
      }, 800)
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

  const handleSaveSchedule = async () => {
    if (!newScheduleDate) {
      setScheduleMsg('Selecciona una fecha')
      return
    }
    setSavingSchedule(true)
    const { error } = await supabase
      .from('equipos')
      .update({ proximo_mantenimiento: newScheduleDate })
      .eq('id', schedulingEquipo.id)

    if (error) {
      setScheduleMsg(error.message)
    } else {
      setScheduleMsg(null)
      setSchedulingEquipo(null)
      loadDashboardData()
    }
    setSavingSchedule(false)
  }

  const setPresetDate = (months) => {
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setNewScheduleDate(`${year}-${month}-${day}`)
  }

  // ANIMACIÓN DE CARGA MÓVIL/WEB DE ALTA GAMA CON CARGA.GIF
  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <img src="/carga.gif" alt="Cargando Mantenizapp..." style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
        <div style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', letterSpacing: '-0.02em', opacity: 0.8 }}>
          Sincronizando con Mantenizapp...
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* HEADER EXACTO AL MOCKUP (con nombre de página) */}
      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '28px', fontWeight: '850', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Dashboard</h1>
          <p className="page-sub" style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>
            {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Isologotipo corporativo decorativo en Desktop */}
        <img className="desktop-brand-logo" src="/isologotipo.png" alt="Mantenizapp" style={{ height: '48px', objectFit: 'contain', opacity: 0.9 }} />
      </div>

      {/* ATAJOS OPERACIONALES RÁPIDOS */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setCurrent('presupuestos')} 
            className="btn btn-secondary" 
            style={{ flex: 1, minWidth: '150px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: '10px', color: 'var(--accent)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Presupuesto IA
          </button>
          <button 
            onClick={() => setCurrent('informes')} 
            className="btn btn-secondary" 
            style={{ flex: 1, minWidth: '150px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: '10px', color: 'var(--accent)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Emitir Informe
          </button>
          <button 
            onClick={() => { setQuickForm(f => ({ ...f, type: 'cliente' })); setShowQuickModal(true); }} 
            className="btn btn-secondary" 
            style={{ flex: 1, minWidth: '150px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: '10px', color: 'var(--accent)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: Tareas de Mantenimiento Hoy (REALES) */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px', letterSpacing: '-0.01em' }}>
          Mantenimientos para Hoy
        </h2>
        
        {hoyList.length === 0 && semanaList.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '8px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>¡Todo al día!</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>No hay tareas programadas para hoy ni para esta semana.</div>
          </div>
        ) : (
          <div className="today-tasks-slider">
            {/* Tareas de Hoy */}
            {hoyList.map(eq => (
              <div key={eq.id} className="task-card-mock" style={{ borderLeft: '3px solid var(--accent)' }}>
                <div className="task-icon-box" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div>
                  <div className="task-title-mock" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{eq.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{eq.clientes?.nombre}</div>
                  <div className="task-time-mock" style={{ marginTop: '8px', color: 'var(--accent)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Programado Hoy
                  </div>
                </div>
                <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', fontSize: '18px', fontWeight: 'bold' }}>⋮</div>
              </div>
            ))}

            {/* Mantenimientos Próximos de la Semana */}
            {semanaList.map(eq => (
              <div key={eq.id} className="task-card-mock" style={{ borderLeft: '3px solid #fbbf24' }}>
                <div className="task-icon-box" style={{ background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
                </div>
                <div>
                  <div className="task-title-mock" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{eq.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{eq.clientes?.nombre}</div>
                  <div className="task-time-mock" style={{ marginTop: '8px', color: '#d97706' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {eq.proximo_mantenimiento}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: Centro de Comunicación y Seguimiento Rápido con buscador */}
      <div className="card" style={{ marginBottom: '28px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: '850', fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Centro de Comunicación Rápida</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>Envía notificaciones de seguimiento con un solo clic</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </div>

        {clientesList.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <input 
              className="form-input" 
              placeholder="Buscar cliente por nombre..." 
              value={searchClient} 
              onChange={e => setSearchClient(e.target.value)} 
              style={{ padding: '10px 12px 10px 36px', fontSize: '13px', borderRadius: '8px', width: '100%' }} 
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        )}

        {clientesList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '13px' }}>
            No hay clientes registrados aún.
          </div>
        ) : clientesList.filter(c => c.nombre.toLowerCase().includes(searchClient.toLowerCase())).length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '13px' }}>
            No se encontraron clientes que coincidan con la búsqueda.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {clientesList
              .filter(c => c.nombre.toLowerCase().includes(searchClient.toLowerCase()))
              .map(c => {
                const formattedWaText = encodeURIComponent(`Estimado *${c.nombre}*, le escribimos desde *Mantenizapp* para hacer seguimiento a sus mantenimientos preventivos. ¿Nos confirma si tiene disponibilidad esta semana para coordinar la visita técnica? Quedamos atentos.`);
                const formattedMailBody = encodeURIComponent(`Estimado ${c.nombre},\n\nLe escribimos desde Mantenizapp para dar seguimiento a los mantenimientos preventivos de sus equipos.\n\nPor favor, confírmenos si tiene disponibilidad esta semana para coordinar la fecha de la visita.\n\nAtentamente,\nServicio Técnico Mantenizapp`);
                
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>{c.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {c.telefono || 'Sin teléfono'} · {c.correo || 'Sin correo'}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {c.telefono && (
                        <button 
                          onClick={() => window.open(`https://wa.me/${c.telefono}?text=${formattedWaText}`, '_blank')}
                          className="btn btn-secondary btn-sm"
                          style={{ background: '#25d366', color: '#fff', border: 'none', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '11px' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                          WhatsApp
                        </button>
                      )}
                      
                      {c.correo && (
                        <button 
                          onClick={() => window.open(`mailto:${c.correo}?subject=Seguimiento%20de%20Mantenimiento%20-%20Mantenizapp&body=${formattedMailBody}`, '_blank')}
                          className="btn btn-secondary btn-sm"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '11px' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Email
                        </button>
                      )}

                      {c.telefono && (
                        <button 
                          onClick={() => window.open(`tel:${c.telefono}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Llamar por teléfono"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: Seguimiento y Agenda de Mantenimientos Próximos */}
      <div className="card" style={{ marginBottom: '28px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: '850', fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Seguimiento y Agenda de Mantenimientos</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', marginTop: '2px' }}>Gestión de vencimientos, notificaciones personalizadas y programación</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>

        {equiposList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '13px' }}>
            No hay equipos registrados en el sistema.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {equiposList.map(eq => {
              const cliente = eq.clientes
              if (!cliente) return null

              let statusLabel = 'Sin Programar'
              let statusColor = 'var(--text-muted)'
              let statusBg = 'var(--bg-base)'
              
              if (eq.proximo_mantenimiento) {
                const todayStr = getTodayString()
                const hoy = new Date()
                hoy.setHours(0,0,0,0)
                const dateParts = eq.proximo_mantenimiento.split('-')
                const fechaProx = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
                fechaProx.setHours(0,0,0,0)

                if (eq.proximo_mantenimiento === todayStr) {
                  statusLabel = 'Programado Hoy'
                  statusColor = '#2563eb'
                  statusBg = '#dbeafe'
                } else if (fechaProx < hoy) {
                  statusLabel = 'Atrasado / Urgente'
                  statusColor = '#dc2626'
                  statusBg = '#fee2e2'
                } else {
                  const diffDays = (fechaProx - hoy) / 86400000
                  if (diffDays <= 7) {
                    statusLabel = 'Próximo esta semana'
                    statusColor = '#d97706'
                    statusBg = '#fef3c7'
                  } else {
                    statusLabel = 'Al día'
                    statusColor = '#16a34a'
                    statusBg = '#dcfce7'
                  }
                }
              }

              // Mensaje detallado: su equipo (nombre) su último mantenimiento fue (fecha) y ya está pronto a que sea , quisiera agendar.
              const waTextRaw = `Estimado *${cliente.nombre}*, le escribimos desde *Mantenizapp*. Le informamos que su equipo *${eq.nombre}* tuvo su último mantenimiento el *${eq.ultimo_mantenimiento || '—'}* y ya está pronto a que sea el siguiente (Próximo mantenimiento programado: *${eq.proximo_mantenimiento || 'Sin programar'}*). Quisiera agendar su próxima visita técnica. ¿Me confirma su disponibilidad? Quedamos atentos.`
              const formattedWaText = encodeURIComponent(waTextRaw)
              
              const mailBodyRaw = `Estimado ${cliente.nombre},\n\nLe escribimos de Mantenizapp para informarle que su equipo ${eq.nombre} tuvo su último mantenimiento el ${eq.ultimo_mantenimiento || '—'} y ya está pronto a que sea el siguiente (Próximo mantenimiento programado: ${eq.proximo_mantenimiento || 'Sin programar'}).\n\nQuisiera agendar su próxima visita técnica para garantizar su correcto funcionamiento. ¿Nos confirma qué día y hora le convienen?\n\nQuedamos atentos.\n\nAtentamente,\nServicio Técnico Mantenizapp`
              const formattedMailBody = encodeURIComponent(mailBodyRaw)

              return (
                <div key={eq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>{eq.nombre}</span>
                      <span className="badge" style={{ background: statusBg, color: statusColor, fontSize: '10px', padding: '2px 6px', fontWeight: 'bold' }}>{statusLabel}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Cliente: <span style={{ fontWeight: '600' }}>{cliente.nombre}</span> · Tel: {cliente.telefono || '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Último Mant.: <span style={{ fontWeight: '600' }}>{eq.ultimo_mantenimiento || '—'}</span> · Próximo Mant.: <span style={{ fontWeight: '600', color: statusColor }}>{eq.proximo_mantenimiento || 'Sin programar'}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {cliente.telefono && (
                      <button 
                        onClick={() => window.open(`https://wa.me/${cliente.telefono}?text=${formattedWaText}`, '_blank')}
                        className="btn btn-secondary btn-sm"
                        style={{ background: '#25d366', color: '#fff', border: 'none', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '11px' }}
                        title="Notificar y Agendar por WhatsApp"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        WhatsApp
                      </button>
                    )}

                    {cliente.correo && (
                      <button 
                        onClick={() => window.open(`mailto:${cliente.correo}?subject=Agendar%20Mantenimiento%20Preventivo%20-%20Mantenizapp&body=${formattedMailBody}`, '_blank')}
                        className="btn btn-secondary btn-sm"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', fontSize: '11px' }}
                        title="Notificar por Email"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Email
                      </button>
                    )}
                    
                    <button 
                      onClick={() => {
                        setSchedulingEquipo(eq)
                        setNewScheduleDate(eq.proximo_mantenimiento || '')
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Agendar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '13px', fontWeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>Todo al día. Sin mantenimientos atrasados.</span>
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

      {/* AGENDAR MODAL */}
      {schedulingEquipo && (
        <div className="modal-overlay" onClick={() => setSchedulingEquipo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Agenda de Mantenimiento</h3>
              <button onClick={() => setSchedulingEquipo(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {scheduleMsg && <div className="auth-error" style={{ marginBottom: 16 }}>{scheduleMsg}</div>}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{schedulingEquipo.nombre}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
                Cliente: {schedulingEquipo.clientes?.nombre}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                Último mantenimiento realizado: {schedulingEquipo.ultimo_mantenimiento || 'Ninguno'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha del Próximo Mantenimiento</label>
              <input 
                type="date" 
                className="form-input" 
                value={newScheduleDate} 
                onChange={e => setNewScheduleDate(e.target.value)} 
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>Accesos Rápidos (Planificar en...)</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPresetDate(3)} style={{ fontSize: '12px', padding: '6px 12px' }}>+3 Meses</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setPresetDate(6)} style={{ fontSize: '12px', padding: '6px 12px' }}>+6 Meses</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setPresetDate(12)} style={{ fontSize: '12px', padding: '6px 12px' }}>+1 Año</button>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const d = new Date()
                  d.setDate(d.getDate() + 1)
                  const y = d.getFullYear()
                  const m = String(d.getMonth() + 1).padStart(2, '0')
                  const day = String(d.getDate()).padStart(2, '0')
                  setNewScheduleDate(`${y}-${m}-${day}`)
                }} style={{ fontSize: '12px', padding: '6px 12px' }}>Mañana</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSaveSchedule} disabled={savingSchedule} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {savingSchedule ? <span className="spinner" /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                )}
                {savingSchedule ? 'Guardando...' : 'Confirmar Agenda'}
              </button>
              <button className="btn btn-secondary" onClick={() => setSchedulingEquipo(null)} disabled={savingSchedule}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
