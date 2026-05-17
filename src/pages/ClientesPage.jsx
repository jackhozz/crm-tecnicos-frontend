import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

const defaultClientForm = () => ({
  nombre: '',
  telefono: '',
  direccion: '',
})

const defaultEquipoForm = () => ({
  nombre: '',
  marca: '',
  modelo: '',
  serial: '',
  tipo_equipo: '',
  ultimo_mantenimiento: '',
  intervalo: '6',
  intervalo_unidad: 'meses',
  notas: '',
})

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

export default function ClientesPage() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'new-client' | 'details'

  const [clientForm, setClientForm] = useState(defaultClientForm())
  const [equipoForm, setEquipoForm] = useState(defaultEquipoForm())
  // Especificaciones dinámicas: array de { key, value, unit }
  const [specs, setSpecs] = useState([{ key: '', value: '', unit: '' }])
  const [selectedClient, setSelectedClient] = useState(null)
  const [equipos, setEquipos] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [clientAgendas, setClientAgendas] = useState([])
  const [showAgendaModal, setShowAgendaModal] = useState(false)
  const [agendaForm, setAgendaForm] = useState({ equipoId: '', fecha: '', hora: '', notas: '' })
  const [savingAgenda, setSavingAgenda] = useState(false)

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*, equipos(id)')
      .order('nombre', { ascending: true })
    if (!error) {
      setClientes(data || [])
    } else {
      setMsg({ type: 'error', text: 'Error de Supabase: ' + error.message })
    }
    setLoading(false)
  }

  const fetchClientDetails = async (client) => {
    setLoading(true)
    setSelectedClient(client)
    setMsg(null)
    
    const { data: eqs, error: eqsErr } = await supabase
      .from('equipos')
      .select('*, especificaciones_equipos(*)')
      .eq('cliente_id', client.id)
      .order('nombre', { ascending: true })
      
    if (eqsErr) {
      setMsg({ type: 'error', text: 'Error de Supabase: ' + eqsErr.message })
      setEquipos([])
      setClientAgendas([])
    } else {
      setEquipos(eqs || [])
      
      const eqIds = (eqs || []).map(e => e.id)
      if (eqIds.length > 0) {
        const { data: ags, error: agsErr } = await supabase
          .from('agenda')
          .select('*')
          .in('equipo_id', eqIds)
          .order('fecha', { ascending: true })
        if (!agsErr) {
          setClientAgendas(ags || [])
        } else {
          console.warn('Tabla agenda no disponible:', agsErr.message)
          setClientAgendas([])
        }
      } else {
        setClientAgendas([])
      }
    }
    setLoading(false)
    setView('details')
  }

  const handleCreateClient = async (e) => {
    e.preventDefault()
    if (!clientForm.nombre.trim()) return
    setSaving(true)
    setMsg(null)
    const { error } = await supabase.from('clientes').insert({
      nombre: clientForm.nombre,
      telefono: clientForm.telefono,
      direccion: clientForm.direccion,
      user_id: user.id
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Cliente creado con éxito.' })
      setClientForm(defaultClientForm())
      fetchClientes()
      setView('list')
    }
    setSaving(false)
  }

  const addSpec = () => setSpecs(s => [...s, { key: '', value: '', unit: '' }])
  const removeSpec = (idx) => setSpecs(s => s.filter((_, i) => i !== idx))
  const updateSpec = (idx, field, val) => setSpecs(s => s.map((sp, i) => i === idx ? { ...sp, [field]: val } : sp))

  const handleCreateEquipo = async (e) => {
    e.preventDefault()
    if (!equipoForm.nombre.trim()) return
    setSaving(true)
    setMsg(null)

    try {
      const proximoCalculado = calcularProximaFecha(
        equipoForm.ultimo_mantenimiento,
        equipoForm.intervalo,
        equipoForm.intervalo_unidad
      )

      const { data: equipoData, error: equipoError } = await supabase
        .from('equipos')
        .insert({
          cliente_id: selectedClient.id,
          nombre: equipoForm.nombre,
          marca: equipoForm.marca,
          modelo: equipoForm.modelo,
          serial: equipoForm.serial,
          capacidad: equipoForm.tipo_equipo,
          tipo: equipoForm.tipo_equipo || 'Equipo', // Compatibilidad con columna 'tipo' obligatoria en base de datos del usuario
          ultimo_mantenimiento: equipoForm.ultimo_mantenimiento || null,
          proximo_mantenimiento: proximoCalculado || null,
          intervalo_mantenimiento: parseInt(equipoForm.intervalo) || null,
          intervalo_unidad: equipoForm.intervalo_unidad,
          refrigerante: equipoForm.notas,
        })
        .select()
        .single()

      if (equipoError) throw equipoError

      // Convertir specs dinámicas a objeto JSON estructurado con unidades de medida
      const specsObj = {}
      specs.filter(s => s.key.trim()).forEach(s => {
        specsObj[s.key.trim()] = { value: s.value, unit: s.unit }
      })

      await supabase.from('especificaciones_equipos').insert({
        equipo_id: equipoData.id,
        datos: specsObj, // Columna JSONB dedicada para especificaciones flexibles
      })

      setMsg({ type: 'success', text: 'Equipo registrado con éxito.' })
      setEquipoForm(defaultEquipoForm())
      setSpecs([{ key: '', value: '', unit: '' }])
      fetchClientDetails(selectedClient)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAgenda = async (e) => {
    e.preventDefault()
    if (!agendaForm.equipoId || !agendaForm.fecha) {
      setMsg({ type: 'error', text: 'Selecciona un equipo y define una fecha para la visita.' })
      return
    }
    setSavingAgenda(true)
    
    const { error } = await supabase
      .from('agenda')
      .insert({
        user_id: user.id,
        equipo_id: agendaForm.equipoId,
        fecha: agendaForm.fecha,
        hora: agendaForm.hora || null,
        notas: agendaForm.notas || null,
        estado: 'pendiente'
      })

    if (error) {
      setMsg({ type: 'error', text: 'Error al programar visita: ' + error.message })
    } else {
      setMsg({ type: 'success', text: 'Visita programada con éxito en la agenda.' })
      setShowAgendaModal(false)
      setAgendaForm({ equipoId: '', fecha: '', hora: '', notas: '' })
      fetchClientDetails(selectedClient)
    }
    setSavingAgenda(false)
  }

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.direccion?.toLowerCase().includes(search.toLowerCase())
  )

  // Parsear specs del JSON guardado
  const parseSpecs = (specsData) => {
    try {
      if (!specsData) return {}
      if (typeof specsData === 'object') return specsData
      return JSON.parse(specsData)
    } catch { return {} }
  }

  // ---- VISTA NUEVO CLIENTE ----
  if (view === 'new-client') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Nuevo Cliente</h1>
            <p className="page-sub">Registra los datos de contacto</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setMsg(null) }}>Volver</button>
        </div>

        {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 20 }}>{msg.text}</div>}

        <div className="card" style={{ maxWidth: 560 }}>
          <form onSubmit={handleCreateClient}>
            <div className="form-group">
              <label className="form-label">Nombre / Empresa *</label>
              <input className="form-input" placeholder="Ej. Comercial del Norte C.A." value={clientForm.nombre} onChange={e => setClientForm({ ...clientForm, nombre: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" placeholder="584121234567" value={clientForm.telefono} onChange={e => setClientForm({ ...clientForm, telefono: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Dirección</label>
              <textarea className="form-textarea" placeholder="Calle, ciudad, estado..." value={clientForm.direccion} onChange={e => setClientForm({ ...clientForm, direccion: e.target.value })} rows={3} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ---- VISTA DETALLE / EQUIPOS ----
  if (view === 'details') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{selectedClient.nombre}</h1>
            <p className="page-sub">{selectedClient.telefono || 'Sin teléfono'} · {selectedClient.direccion || 'Sin dirección'}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setMsg(null); fetchClientes() }}>Volver</button>
        </div>

        {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 20 }}>{msg.text}</div>}

        <div className="grid-3" style={{ alignItems: 'start' }}>

          {/* Equipos registrados (2/3) */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
              Equipos del cliente ({equipos.length})
            </h2>

            {equipos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 }}>
                Aún no hay equipos registrados para este cliente.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {equipos.map(eq => {
                  const specs = parseSpecs(eq.especificaciones_equipos?.[0]?.datos)
                  const specEntries = Object.entries(specs)
                  return (
                    <div key={eq.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{eq.nombre}</h3>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {[eq.marca, eq.modelo, eq.serial].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        {eq.proximo_mantenimiento && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Próximo mantenimiento</div>
                            <span className="badge badge-blue">{eq.proximo_mantenimiento}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6, fontSize: 13, background: 'var(--bg-base)', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                        {eq.capacidad && <div><strong>Tipo:</strong> {eq.capacidad}</div>}
                        {eq.ultimo_mantenimiento && <div><strong>Último mant.:</strong> {eq.ultimo_mantenimiento}</div>}
                        {eq.intervalo_mantenimiento && (
                          <div>
                            <strong>Frecuencia:</strong> {eq.intervalo_mantenimiento} {eq.intervalo_unidad || 'meses'}
                          </div>
                        )}
                        {eq.proximo_mantenimiento && (() => {
                          const hoy = new Date()
                          hoy.setHours(0,0,0,0)
                          const [y,m,d] = eq.proximo_mantenimiento.split('-').map(Number)
                          const fechaProx = new Date(y, m-1, d)
                          const dias = Math.round((fechaProx - hoy) / 86400000)
                          const color = dias < 0 ? '#ef4444' : dias <= 7 ? '#f59e0b' : 'var(--success)'
                          return (
                            <div style={{ color }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Próximo mant.:</strong>{' '}
                              {eq.proximo_mantenimiento}
                              <span style={{ marginLeft: 6, fontSize: 11 }}>
                                ({dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? 'Hoy' : `en ${dias}d`})
                              </span>
                            </div>
                          )
                        })()}
                        {eq.refrigerante && <div style={{ gridColumn: 'span 2' }}><strong>Notas:</strong> {eq.refrigerante}</div>}
                      </div>

                      {specEntries.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                            Especificaciones Técnicas
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {specEntries.map(([k, v]) => {
                              const displayVal = typeof v === 'object' && v !== null
                                ? `${v.value} ${v.unit || ''}`.trim()
                                : v
                              return (
                                <span key={k} style={{ fontSize: 12, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 6, fontWeight: 500 }}>
                                  <strong>{k}:</strong> {displayVal}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Agendas asociadas a este equipo */}
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            Historial de Citas y Visitas
                          </span>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => {
                              setAgendaForm({ equipoId: eq.id, fecha: '', hora: '', notas: '' })
                              setShowAgendaModal(true)
                            }}
                          >
                            + Programar Visita
                          </button>
                        </div>

                        {clientAgendas.filter(a => a.equipo_id === eq.id).length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                            Sin visitas agendadas para este equipo.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {clientAgendas.filter(a => a.equipo_id === eq.id).map(a => {
                              const badgeColor = a.estado === 'pendiente' ? 'var(--accent)' : a.estado === 'realizado' ? 'var(--success)' : 'var(--text-muted)'
                              const badgeBg = a.estado === 'pendiente' ? 'var(--accent-soft)' : a.estado === 'realizado' ? 'rgba(22, 163, 74, 0.08)' : 'var(--bg-base)'
                              return (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-base)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                  <div style={{ fontSize: 12 }}>
                                    <span style={{ fontWeight: 700 }}>{a.fecha}</span> {a.hora && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({a.hora})</span>}
                                    {a.notas && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>📝 {a.notas}</div>}
                                  </div>
                                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: badgeBg, color: badgeColor, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {a.estado === 'pendiente' ? 'Programado' : a.estado === 'realizado' ? 'Realizado' : 'Cancelado'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Formulario agregar equipo (1/3) */}
          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Agregar Equipo</h2>
            <form onSubmit={handleCreateEquipo}>
              <div className="form-group">
                <label className="form-label">Nombre Identificador *</label>
                <input className="form-input" placeholder="Ej. Aire Lobby / Compresor 1" value={equipoForm.nombre} onChange={e => setEquipoForm({ ...equipoForm, nombre: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Equipo</label>
                <input className="form-input" placeholder="Ej. Aire Split, Cava, Motor..." value={equipoForm.tipo_equipo} onChange={e => setEquipoForm({ ...equipoForm, tipo_equipo: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input className="form-input" placeholder="Samsung" value={equipoForm.marca} onChange={e => setEquipoForm({ ...equipoForm, marca: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input className="form-input" placeholder="AS12UBA" value={equipoForm.modelo} onChange={e => setEquipoForm({ ...equipoForm, modelo: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Serial / N° de Serie</label>
                <input className="form-input" placeholder="SN12345" value={equipoForm.serial} onChange={e => setEquipoForm({ ...equipoForm, serial: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Último Mantenimiento</label>
                <input
                  type="date"
                  className="form-input"
                  value={equipoForm.ultimo_mantenimiento}
                  onChange={e => setEquipoForm({ ...equipoForm, ultimo_mantenimiento: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Frecuencia de Mantenimiento</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ej. 6"
                    min="1"
                    value={equipoForm.intervalo}
                    onChange={e => setEquipoForm({ ...equipoForm, intervalo: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-input"
                    value={equipoForm.intervalo_unidad}
                    onChange={e => setEquipoForm({ ...equipoForm, intervalo_unidad: e.target.value })}
                    style={{ flex: 1 }}
                  >
                    <option value="dias">Días</option>
                    <option value="meses">Meses</option>
                    <option value="anos">Años</option>
                  </select>
                </div>
              </div>

              {/* Preview automática de próxima fecha */}
              {equipoForm.ultimo_mantenimiento && equipoForm.intervalo && (() => {
                const proxima = calcularProximaFecha(equipoForm.ultimo_mantenimiento, equipoForm.intervalo, equipoForm.intervalo_unidad)
                if (!proxima) return null
                const hoy = new Date()
                hoy.setHours(0,0,0,0)
                const [y,m,d] = proxima.split('-').map(Number)
                const fechaProx = new Date(y, m-1, d)
                const diasRestantes = Math.round((fechaProx - hoy) / 86400000)
                const color = diasRestantes < 0 ? '#ef4444' : diasRestantes <= 7 ? '#f59e0b' : 'var(--success)'
                return (
                  <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 2 }}>Próximo mantenimiento calculado:</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{proxima}</div>
                    <div style={{ color, fontSize: 12, marginTop: 2 }}>
                      {diasRestantes < 0
                        ? `Atrasado por ${Math.abs(diasRestantes)} días`
                        : diasRestantes === 0
                        ? 'Hoy'
                        : `En ${diasRestantes} días`}
                    </div>
                  </div>
                )
              })()}

              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" placeholder="Observaciones generales..." value={equipoForm.notas} onChange={e => setEquipoForm({ ...equipoForm, notas: e.target.value })} rows={2} />
              </div>

              {/* Especificaciones técnicas dinámicas */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
                    Especificaciones Técnicas
                  </span>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={addSpec}>
                    + Agregar campo
                  </button>
                </div>

                {specs.map((sp, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                    <input
                      className="form-input"
                      placeholder="Nombre (Ej. Presión)"
                      value={sp.key}
                      onChange={e => updateSpec(idx, 'key', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Valor (Ej. 65)"
                      value={sp.value}
                      onChange={e => updateSpec(idx, 'value', e.target.value)}
                      style={{ flex: 1.5 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Unidad (Ej. PSI)"
                      value={sp.unit}
                      onChange={e => updateSpec(idx, 'unit', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {specs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSpec(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving}>
                {saving ? 'Registrando...' : 'Registrar Equipo'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ---- VISTA PRINCIPAL (LISTADO) ----
  return (
    <>
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Directorio de Clientes</h1>
            <p className="page-sub">{clientes.length} clientes registrados</p>
          </div>
          <button className="btn btn-primary" onClick={() => setView('new-client')}>+ Nuevo Cliente</button>
        </div>

        <div className="form-group" style={{ marginBottom: 24 }}>
          <input
            className="form-input"
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <span className="spinner" style={{ margin: 'auto', display: 'block', width: 32, height: 32 }} />
          </div>
        ) : filteredClientes.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
            No se encontraron clientes.
          </div>
        ) : (
          <div className="grid-2">
            {filteredClientes.map(c => {
              const numEquipos = c.equipos?.length || 0
              return (
                <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{c.nombre}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.direccion || 'Sin dirección'}</div>
                    </div>
                    <span className="badge badge-blue">{numEquipos} equipo{numEquipos !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {c.telefono && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => window.open(`https://wa.me/${c.telefono}`, '_blank')}
                      >
                        WhatsApp
                      </button>
                    )}
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => fetchClientDetails(c)}
                    >
                      Ver Equipos →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL PROGRAMAR VISITA DE ALTA GAMA */}
      {showAgendaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Programar Visita en Agenda</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, margin: '2px 0 0 0' }}>Coordina y agenda una visita física con el cliente</p>
              </div>
              <button 
                onClick={() => setShowAgendaModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24, padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAgenda}>
              <div className="form-group">
                <label className="form-label">Fecha de Visita *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={agendaForm.fecha} 
                  onChange={e => setAgendaForm({ ...agendaForm, fecha: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hora Estimada</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: 09:30 AM o 14:00" 
                  value={agendaForm.hora} 
                  onChange={e => setAgendaForm({ ...agendaForm, hora: e.target.value })} 
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Notas o Indicaciones Especiales</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Ej: Traer filtros de reemplazo y refrigerante..." 
                  value={agendaForm.notas} 
                  onChange={e => setAgendaForm({ ...agendaForm, notas: e.target.value })} 
                  rows={3} 
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAgendaModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingAgenda}>
                  {savingAgenda ? 'Guardando...' : 'Programar Visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
