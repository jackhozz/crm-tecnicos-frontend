import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

// Calcula fecha de próximo mantenimiento dada una fecha base y un intervalo
function calcularProximaFecha(fechaBase, intervalo, unidad) {
  if (!fechaBase || !intervalo) return ''
  const [y, m, d] = fechaBase.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const n = parseInt(intervalo)
  if (isNaN(n) || n <= 0) return ''
  let result = new Date(base)
  if (unidad === 'dias') result.setDate(result.getDate() + n)
  else if (unidad === 'meses') result.setMonth(result.getMonth() + n)
  else if (unidad === 'anos') result.setFullYear(result.getFullYear() + n)
  return result.toISOString().split('T')[0]
}

export default function AgendaPage() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDayStr, setSelectedDayStr] = useState(new Date().toISOString().split('T')[0])
  const [profile, setProfile] = useState(null)
  
  // States for Rescheduling
  const [editingEquipo, setEditingEquipo] = useState(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetchEquiposConMantenimiento()
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err)
    }
  }

  const fetchEquiposConMantenimiento = async () => {
    setLoading(true)
    
    let agendaSuccess = false
    try {
      const { data, error } = await supabase
        .from('agenda')
        .select('*, equipos(*, clientes(*))')
        .eq('estado', 'pendiente')
        .order('fecha', { ascending: true })

      if (!error) {
        const mappedData = (data || []).map(ag => {
          if (!ag.equipos) return null
          return {
            ...ag.equipos,
            agenda_id: ag.id,
            fecha_agenda_real: ag.fecha,
            hora_agenda_real: ag.hora,
            notas_agenda_real: ag.notes || ag.notas,
            estado_agenda_real: ag.estado,
            clientes: ag.equipos.clientes
          }
        }).filter(Boolean)

        setEquipos(mappedData)
        agendaSuccess = true
      } else {
        console.warn('Fallo al obtener tabla agenda, usando fallback en proximo_mantenimiento:', error.message)
      }
    } catch (err) {
      console.warn('Error general obteniendo agenda:', err)
    }

    if (!agendaSuccess) {
      const { data, error } = await supabase
        .from('equipos')
        .select('*, clientes(*)')
        .not('proximo_mantenimiento', 'is', null)
        .order('proximo_mantenimiento', { ascending: true })
      
      if (error) {
        setMsg({ type: 'error', text: error.message })
      } else {
        const mappedData = (data || []).map(eq => ({
          ...eq,
          fecha_agenda_real: eq.proximo_mantenimiento,
          hora_agenda_real: null,
          notas_agenda_real: null,
          estado_agenda_real: 'pendiente'
        }))
        setEquipos(mappedData)
      }
    }

    setLoading(false)
  }

  const rescheduleMaintenance = async (e) => {
    e.preventDefault()
    if (!editingEquipo || !newDate) return
    setUpdating(true)
    
    if (editingEquipo.agenda_id) {
      const { error } = await supabase
        .from('agenda')
        .update({
          fecha: newDate,
          hora: newTime || null,
          notas: newNotes || null
        })
        .eq('id', editingEquipo.agenda_id)

      if (error) {
        setMsg({ type: 'error', text: 'Error al reprogramar: ' + error.message })
      } else {
        setMsg({ type: 'success', text: 'Cita en agenda reprogramada con éxito.' })
        setEditingEquipo(null)
        fetchEquiposConMantenimiento()
      }
    } else {
      const { error } = await supabase
        .from('equipos')
        .update({ proximo_mantenimiento: newDate })
        .eq('id', editingEquipo.id)

      if (error) {
        setMsg({ type: 'error', text: 'Error al reprogramar: ' + error.message })
      } else {
        setMsg({ type: 'success', text: 'Mantenimiento reprogramado con éxito.' })
        setEditingEquipo(null)
        fetchEquiposConMantenimiento()
      }
    }
    setUpdating(false)
  }

  const handleCompleteVisit = async (eq) => {
    if (!eq.agenda_id) {
      alert('Esta cita no tiene un registro en la agenda (cargada por fallback). No se puede completar desde aquí.')
      return
    }

    const confirm = window.confirm(`¿Estás seguro de marcar esta visita de mantenimiento para "${eq.nombre}" como REALIZADA?\n\nSe actualizará la fecha de último mantenimiento a: ${eq.fecha_agenda_real}`)
    if (!confirm) return

    setUpdating(true)
    try {
      let proximoCalculado = null
      if (eq.intervalo_mantenimiento) {
        proximoCalculado = calcularProximaFecha(
          eq.fecha_agenda_real,
          eq.intervalo_mantenimiento,
          eq.intervalo_unidad || 'meses'
        )
      }

      const { error: eqError } = await supabase
        .from('equipos')
        .update({
          ultimo_mantenimiento: eq.fecha_agenda_real,
          proximo_mantenimiento: proximoCalculado
        })
        .eq('id', eq.id)

      if (eqError) throw eqError

      const { error: agError } = await supabase
        .from('agenda')
        .update({ estado: 'realizado' })
        .eq('id', eq.agenda_id)

      if (agError) throw agError

      setMsg({ type: 'success', text: `¡Visita técnica completada! Se guardó como último mantenimiento la fecha ${eq.fecha_agenda_real} y se recalculó la fecha técnica recomendada a: ${proximoCalculado || 'Sin calcular'}` })
      fetchEquiposConMantenimiento()
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al completar la visita: ' + err.message })
    }
    setUpdating(false)
  }

  // --- CALENDAR GRID CALCULATIONS ---
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // First day of the month (0 = Sunday, 1 = Monday, etc. Adjusting to Monday-start)
  const firstDayIndex = new Date(year, month, 1).getDay()
  // Adjust so Monday is 0, Sunday is 6
  const startDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDayStr(today.toISOString().split('T')[0])
  }

  // Generate calendar cells (blank spaces for offset + month days)
  const cells = []
  for (let i = 0; i < startDayOffset; i++) {
    cells.push({ type: 'empty', id: `empty-${i}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEquipos = equipos.filter(e => e.fecha_agenda_real === dateStr)
    cells.push({ type: 'day', day: d, dateStr, dayEquipos })
  }

  // Group cells into rows of 7
  const rows = []
  let currentRow = []
  cells.forEach((cell, idx) => {
    currentRow.push(cell)
    if (currentRow.length === 7 || idx === cells.length - 1) {
      while (currentRow.length < 7) {
        currentRow.push({ type: 'empty', id: `empty-fill-${currentRow.length}` })
      }
      rows.push(currentRow)
      currentRow = []
    }
  })

  // Selected Day Details
  const selectedDayEquipos = equipos.filter(e => e.fecha_agenda_real === selectedDayStr)

  // Message Helper
  const getWhatsAppLink = (eq) => {
    const clientName = eq.clientes?.nombre || 'Cliente'
    const phone = eq.clientes?.telefono || ''
    const techSignature = profile ? `${profile.nombre || ''} ${profile.apellido || ''} (${profile.grado_profesion || 'Técnico'})`.trim() : 'Su Técnico Especialista'
    const horaStr = eq.hora_agenda_real ? ` a las ${eq.hora_agenda_real}` : ''
    
    const text = `Hola ${clientName}, le saluda ${techSignature}. Quería recordarle que tenemos programado el mantenimiento de su equipo "${eq.nombre}" para la fecha ${eq.fecha_agenda_real}${horaStr}. Por favor confírmeme si la fecha y hora son convenientes para usted. ¡Muchas gracias!`
    return `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(text)}`
  }

  const getEmailLink = (eq) => {
    const clientName = eq.clientes?.nombre || 'Cliente'
    const mail = eq.clientes?.correo || ''
    const techSignature = profile ? `${profile.nombre || ''} ${profile.apellido || ''} (${profile.grado_profesion || 'Técnico'})`.trim() : 'Su Técnico Especialista'
    const horaStr = eq.hora_agenda_real ? ` a las ${eq.hora_agenda_real}` : ''
    
    const subject = `Recordatorio de Mantenimiento Técnico Programado: ${eq.nombre}`
    const body = `Estimado(a) ${clientName},\n\nLe saluda cordialmente ${techSignature}.\n\nEste es un recordatorio para confirmarle que el mantenimiento preventivo de su equipo/sistema:\n- Equipo: ${eq.nombre} (${eq.marca || '—'} / ${eq.modelo || '—'})\n- Fecha Programada: ${eq.fecha_agenda_real}${horaStr}\n\nPor favor, respóndame a este correo para coordinar y confirmar el acceso al equipo.\n\nQuedo a su completa disposición.\n\nAtentamente,\n${techSignature}`
    
    return `mailto:${mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="agenda-container" style={{ padding: '0 4px' }}>
      
      {/* HEADER TABS & ACTIONS */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Agenda de Mantenimientos</h1>
          <p className="page-sub">Planifica, reprograma y mantente en contacto constante con tus clientes</p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', gap: '4px' }}>
          <button 
            onClick={() => setViewMode('calendar')}
            style={{ 
              background: viewMode === 'calendar' ? 'var(--accent)' : 'none', 
              color: viewMode === 'calendar' ? '#fff' : 'var(--text-secondary)',
              border: 'none', 
              padding: '6px 14px', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontSize: '13px', 
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            Calendario
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ 
              background: viewMode === 'list' ? 'var(--accent)' : 'none', 
              color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
              border: 'none', 
              padding: '6px 14px', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontSize: '13px', 
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            Vista Lista
          </button>
        </div>
      </div>

      {msg && (
        <div className={`notice-banner ${msg.type === 'error' ? 'notice-error' : 'notice-success'}`} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <span className="spinner" />
        </div>
      ) : viewMode === 'calendar' ? (
        
        /* 📅 CALENDAR MONTH GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '20px', alignItems: 'start' }}>
          
          {/* Calendar Plate */}
          <div className="premium-card" style={{ padding: '20px' }}>
            
            {/* Calendar Month Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn btn-outline" onClick={prevMonth} style={{ padding: '6px 10px', height: 'auto', minWidth: 'auto' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, textTransform: 'capitalize', minWidth: '120px', textAlign: 'center', letterSpacing: '-0.02em' }}>
                  {monthNames[month]} {year}
                </h3>
                <button className="btn btn-outline" onClick={nextMonth} style={{ padding: '6px 10px', height: 'auto', minWidth: 'auto' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              <button className="btn btn-outline" onClick={goToToday} style={{ padding: '6px 12px', height: 'auto', fontSize: '12px' }}>
                Ir a Hoy
              </button>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              
              {/* Day Titles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                <div>LUN</div>
                <div>MAR</div>
                <div>MIÉ</div>
                <div>JUE</div>
                <div>VIE</div>
                <div>SÁB</div>
                <div>DOM</div>
              </div>

              {/* Rows */}
              {rows.map((row, rIdx) => (
                <div key={`row-${rIdx}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {row.map((cell, cIdx) => {
                    if (cell.type === 'empty') {
                      return (
                        <div 
                          key={cell.id} 
                          style={{ height: '70px', background: 'var(--bg-base)', opacity: 0.25, borderRadius: '6px' }}
                        />
                      )
                    }

                    const isToday = cell.dateStr === new Date().toISOString().split('T')[0]
                    const isSelected = cell.dateStr === selectedDayStr
                    const hasItems = cell.dayEquipos.length > 0

                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => setSelectedDayStr(cell.dateStr)}
                        style={{
                          height: '70px',
                          background: isSelected ? 'var(--bg-base)' : 'var(--bg-card)',
                          border: isSelected 
                            ? '2px solid var(--accent)' 
                            : isToday 
                              ? '1px solid var(--accent)' 
                              : '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        {/* Day number */}
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: isToday || isSelected ? '800' : '500', 
                          color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                          alignSelf: 'flex-start'
                        }}>
                          {cell.day}
                        </span>

                        {/* Dot indicator/Badge */}
                        {hasItems && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                            <div 
                              style={{ 
                                background: isSelected ? 'var(--accent)' : 'var(--text-primary)', 
                                color: isSelected ? '#fff' : 'var(--bg-card)',
                                fontSize: '9px', 
                                fontWeight: 'bold', 
                                padding: '2px 4px', 
                                borderRadius: '4px', 
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {cell.dayEquipos.length === 1 ? cell.dayEquipos[0].nombre : `${cell.dayEquipos.length} mant.`}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

            </div>
          </div>

          {/* Sidebar Detail Plate */}
          <div className="premium-card" style={{ padding: '20px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mantenimientos Programados
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 800 }}>
                {selectedDayStr.split('-')[2]} de {monthNames[parseInt(selectedDayStr.split('-')[1]) - 1]} del {selectedDayStr.split('-')[0]}
              </h3>
            </div>

            {selectedDayEquipos.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '10px' }}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Sin actividades registradas</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>No hay mantenimientos planificados para esta fecha.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {selectedDayEquipos.map(eq => (
                  <div 
                    key={eq.id} 
                    style={{ 
                      padding: '12px', 
                      background: 'var(--bg-base)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>{eq.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span>Cliente: {eq.clientes?.nombre || '—'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span>Programado: <strong>{eq.fecha_agenda_real}</strong> {eq.hora_agenda_real ? `(${eq.hora_agenda_real})` : ''}</span>
                      </div>
                      {eq.notas_agenda_real && (
                        <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', background: 'var(--accent-soft)', padding: '4px 8px', borderRadius: 6, fontWeight: 500 }}>
                          📝 Nota: {eq.notas_agenda_real}
                        </div>
                      )}
                    </div>

                    {/* Quick Contact & Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                      
                      {/* WhatsApp Button */}
                      {eq.clientes?.telefono && (
                        <a 
                          href={getWhatsAppLink(eq)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-outline" 
                          style={{ padding: '4px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderColor: '#22c55e', color: '#22c55e' }}
                        >
                          WhatsApp
                        </a>
                      )}

                      {/* Reschedule Button */}
                      <button 
                        onClick={() => { 
                          setEditingEquipo(eq); 
                          setNewDate(eq.fecha_agenda_real || eq.proximo_mantenimiento || ''); 
                          setNewTime(eq.hora_agenda_real || '');
                          setNewNotes(eq.notas_agenda_real || '');
                        }}
                        className="btn btn-outline" 
                        style={{ padding: '4px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        Reprogramar
                      </button>

                      {/* Completar Button */}
                      {eq.agenda_id && (
                        <button 
                          onClick={() => handleCompleteVisit(eq)}
                          className="btn" 
                          style={{ gridColumn: 'span 2', padding: '4px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'var(--success)', color: '#fff', border: 'none', fontWeight: 'bold' }}
                        >
                          ✔️ Completar Visita
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      ) : (
        
        /* 📜 CHRONOLOGICAL LIST TIMELINE VIEW */
        <div className="premium-card" style={{ padding: '20px' }}>
          
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Mantenimientos Próximos Programados</h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Lista cronológica completa de equipos a atender</p>
          </div>

          {equipos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px' }}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>No hay mantenimientos programados</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Programa mantenimientos editando la fecha en la ficha técnica de tus equipos.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {equipos.map(eq => {
                const diffTime = new Date(eq.fecha_agenda_real) - new Date()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                const isUrgent = diffDays <= 7 && diffDays >= 0
                const isOverdue = diffDays < 0

                return (
                  <div 
                    key={eq.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '14px', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    
                    {/* Left Info Column */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800 }}>{eq.nombre}</span>
                        <span 
                          style={{ 
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: isOverdue ? '#fee2e2' : isUrgent ? '#ffedd5' : '#f1f5f9',
                            color: isOverdue ? '#ef4444' : isUrgent ? '#ea580c' : '#475569'
                          }}
                        >
                          {isOverdue ? 'Vencido' : isUrgent ? 'Urgente' : 'Programado'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span>Cliente: <strong>{eq.clientes?.nombre || '—'}</strong></span>
                        {eq.marca && <span>Marca: {eq.marca}</span>}
                        {eq.modelo && <span>Modelo: {eq.modelo}</span>}
                        {eq.notas_agenda_real && (
                          <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                            📝 {eq.notas_agenda_real}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Date and Actions Column */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{eq.fecha_agenda_real} {eq.hora_agenda_real ? `(${eq.hora_agenda_real})` : ''}</div>
                        <div style={{ fontSize: '11px', color: isOverdue || isUrgent ? '#ea580c' : 'var(--text-muted)', marginTop: '2px' }}>
                          {isOverdue ? `Hace ${Math.abs(diffDays)} días` : `En ${diffDays} días`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        
                        {eq.clientes?.telefono && (
                          <a 
                            href={getWhatsAppLink(eq)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-outline" 
                            style={{ height: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#22c55e', color: '#22c55e', padding: '0 10px' }}
                          >
                            WhatsApp
                          </a>
                        )}

                        <button 
                          onClick={() => { 
                            setEditingEquipo(eq); 
                            setNewDate(eq.fecha_agenda_real || eq.proximo_mantenimiento || ''); 
                            setNewTime(eq.hora_agenda_real || '');
                            setNewNotes(eq.notas_agenda_real || '');
                          }}
                          className="btn btn-outline" 
                          style={{ height: '32px', fontSize: '12px', padding: '0 10px' }}
                        >
                          Reprogramar
                        </button>

                        {eq.agenda_id && (
                          <button 
                            onClick={() => handleCompleteVisit(eq)}
                            className="btn" 
                            style={{ height: '32px', fontSize: '12px', padding: '0 10px', background: 'var(--success)', color: '#fff', border: 'none', fontWeight: 'bold' }}
                          >
                            ✔️ Completar
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                )
              })}

            </div>
          )}

        </div>
      )}

      {/* 🗓️ REPROGRAMAR MAINTENANCE MODAL (POPUP) */}
      {editingEquipo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="premium-card" style={{ maxWidth: '400px', width: '100%', padding: '24px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Reprogramar Mantenimiento</h3>
              <button 
                onClick={() => setEditingEquipo(null)} 
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={rescheduleMaintenance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Equipo:</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>{editingEquipo.nombre}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cliente:</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px' }}>{editingEquipo.clientes?.nombre || '—'}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Nueva Fecha Programada *</label>
                <input 
                  type="date"
                  className="form-input" 
                  value={newDate} 
                  onChange={e => setNewDate(e.target.value)} 
                  required
                />
              </div>

              {editingEquipo.agenda_id && (
                <>
                  <div className="form-group">
                    <label className="form-label">Hora de Visita</label>
                    <input 
                      type="text"
                      className="form-input" 
                      placeholder="Ej: 10:30 AM o 14:00" 
                      value={newTime} 
                      onChange={e => setNewTime(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas e Indicaciones</label>
                    <textarea 
                      className="form-textarea" 
                      placeholder="Instrucciones adicionales para la visita técnica..." 
                      value={newNotes} 
                      onChange={e => setNewNotes(e.target.value)} 
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingEquipo(null)} 
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={updating}
                  className="btn" 
                  style={{ flex: 1, background: 'var(--accent)', color: '#fff' }}
                >
                  {updating ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}
