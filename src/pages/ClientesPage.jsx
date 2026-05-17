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
  proximo_mantenimiento: '',
  notas: '',
})

export default function ClientesPage() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'new-client' | 'details'

  const [clientForm, setClientForm] = useState(defaultClientForm())
  const [equipoForm, setEquipoForm] = useState(defaultEquipoForm())
  // Especificaciones dinámicas: array de { key, value }
  const [specs, setSpecs] = useState([{ key: '', value: '' }])
  const [selectedClient, setSelectedClient] = useState(null)
  const [equipos, setEquipos] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*, equipos(id)')
      .order('nombre', { ascending: true })
    if (!error) setClientes(data || [])
    setLoading(false)
  }

  const fetchClientDetails = async (client) => {
    setLoading(true)
    setSelectedClient(client)
    const { data, error } = await supabase
      .from('equipos')
      .select('*, especificaciones_equipos(*)')
      .eq('cliente_id', client.id)
      .order('nombre', { ascending: true })
    if (!error) setEquipos(data || [])
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

  const addSpec = () => setSpecs(s => [...s, { key: '', value: '' }])
  const removeSpec = (idx) => setSpecs(s => s.filter((_, i) => i !== idx))
  const updateSpec = (idx, field, val) => setSpecs(s => s.map((sp, i) => i === idx ? { ...sp, [field]: val } : sp))

  const handleCreateEquipo = async (e) => {
    e.preventDefault()
    if (!equipoForm.nombre.trim()) return
    setSaving(true)
    setMsg(null)

    try {
      const { data: equipoData, error: equipoError } = await supabase
        .from('equipos')
        .insert({
          cliente_id: selectedClient.id,
          nombre: equipoForm.nombre,
          marca: equipoForm.marca,
          modelo: equipoForm.modelo,
          serial: equipoForm.serial,
          capacidad: equipoForm.tipo_equipo,
          ultimo_mantenimiento: equipoForm.ultimo_mantenimiento || null,
          proximo_mantenimiento: equipoForm.proximo_mantenimiento || null,
          refrigerante: equipoForm.notas,
        })
        .select()
        .single()

      if (equipoError) throw equipoError

      // Convertir specs dinámicas a objeto JSON
      const specsObj = {}
      specs.filter(s => s.key.trim()).forEach(s => { specsObj[s.key.trim()] = s.value })

      await supabase.from('especificaciones_equipos').insert({
        equipo_id: equipoData.id,
        datos: specsObj, // Columna JSONB dedicada para especificaciones flexibles
      })

      setMsg({ type: 'success', text: 'Equipo registrado con éxito.' })
      setEquipoForm(defaultEquipoForm())
      setSpecs([{ key: '', value: '' }])
      fetchClientDetails(selectedClient)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
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
                        {eq.refrigerante && <div style={{ gridColumn: 'span 2' }}><strong>Notas:</strong> {eq.refrigerante}</div>}
                      </div>

                      {specEntries.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                            Especificaciones Técnicas
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {specEntries.map(([k, v]) => (
                              <span key={k} style={{ fontSize: 12, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 6, fontWeight: 500 }}>
                                <strong>{k}:</strong> {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Último Mantenimiento</label>
                  <input type="date" className="form-input" value={equipoForm.ultimo_mantenimiento} onChange={e => setEquipoForm({ ...equipoForm, ultimo_mantenimiento: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Próximo Mantenimiento</label>
                  <input type="date" className="form-input" value={equipoForm.proximo_mantenimiento} onChange={e => setEquipoForm({ ...equipoForm, proximo_mantenimiento: e.target.value })} />
                </div>
              </div>
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
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input
                      className="form-input"
                      placeholder="Nombre (Ej. Voltaje)"
                      value={sp.key}
                      onChange={e => updateSpec(idx, 'key', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Valor (Ej. 220V)"
                      value={sp.value}
                      onChange={e => updateSpec(idx, 'value', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {specs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSpec(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
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
  )
}
