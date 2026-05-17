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
  capacidad: '',
  refrigerante: '',
  ultimo_mantenimiento: '',
  proximo_mantenimiento: '',
  // especificaciones tecnicas:
  voltaje: '',
  amperaje: '',
  tipo_compresor: '',
  fases: '',
  presion_alta: '',
  presion_baja: '',
})

export default function ClientesPage() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'new-client' | 'details'
  
  // Forms states
  const [clientForm, setClientForm] = useState(defaultClientForm())
  const [equipoForm, setEquipoForm] = useState(defaultEquipoForm())
  const [selectedClient, setSelectedClient] = useState(null)
  const [equipos, setEquipos] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetchClientes()
  }, [])

  const fetchClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*, equipos(id)')
      .order('nombre', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setClientes(data || [])
    }
    setLoading(false)
  }

  const fetchClientDetails = async (client) => {
    setLoading(true)
    setSelectedClient(client)
    
    // Traer equipos y sus especificaciones técnicas mediante un join
    const { data, error } = await supabase
      .from('equipos')
      .select('*, especificaciones_equipos(*)')
      .eq('cliente_id', client.id)
      .order('nombre', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setEquipos(data || [])
    }
    setLoading(false)
    setView('details')
  }

  const handleCreateClient = async (e) => {
    e.preventDefault()
    if (!clientForm.nombre.trim()) return
    setSaving(true)
    setMsg(null)

    const { error } = await supabase
      .from('clientes')
      .insert({
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

  const handleCreateEquipo = async (e) => {
    e.preventDefault()
    if (!equipoForm.nombre.trim()) return
    setSaving(true)
    setMsg(null)

    try {
      // 1. Insertar equipo en la tabla 'equipos'
      const { data: equipoData, error: equipoError } = await supabase
        .from('equipos')
        .insert({
          cliente_id: selectedClient.id,
          nombre: equipoForm.nombre,
          marca: equipoForm.marca,
          modelo: equipoForm.modelo,
          serial: equipoForm.serial,
          capacidad: equipoForm.capacidad,
          refrigerante: equipoForm.refrigerante,
          ultimo_mantenimiento: equipoForm.ultimo_mantenimiento || null,
          proximo_mantenimiento: equipoForm.proximo_mantenimiento || null,
        })
        .select()
        .single()

      if (equipoError) throw equipoError

      // 2. Insertar especificaciones técnicas en la tabla 'especificaciones_equipos'
      const { error: specsError } = await supabase
        .from('especificaciones_equipos')
        .insert({
          equipo_id: equipoData.id,
          voltaje: equipoForm.voltaje,
          amperaje: equipoForm.amperaje,
          tipo_compresor: equipoForm.tipo_compresor,
          fases: equipoForm.fases,
          presion_alta: equipoForm.presion_alta,
          presion_baja: equipoForm.presion_baja
        })

      if (specsError) throw specsError

      setMsg({ type: 'success', text: 'Equipo y especificaciones registradas.' })
      setEquipoForm(defaultEquipoForm())
      fetchClientDetails(selectedClient) // refrescar lista de equipos
    } catch (err) {
      console.error(err)
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.direccion?.toLowerCase().includes(search.toLowerCase())
  )

  // ---- VISTAS ----

  if (view === 'new-client') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Nuevo Cliente</h1>
            <p className="page-sub">Registra los datos del nuevo cliente</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setMsg(null); }}>Volver</button>
        </div>

        {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 20 }}>{msg.text}</div>}

        <div className="card" style={{ maxWidth: 600 }}>
          <form onSubmit={handleCreateClient}>
            <div className="form-group">
              <label className="form-label">Nombre del Cliente / Empresa *</label>
              <input 
                className="form-input" 
                placeholder="Ej. Comercial Frio C.A." 
                value={clientForm.nombre}
                onChange={e => setClientForm({ ...clientForm, nombre: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono de Contacto</label>
              <input 
                className="form-input" 
                placeholder="Ej. 584121234567" 
                value={clientForm.telefono}
                onChange={e => setClientForm({ ...clientForm, telefono: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Dirección</label>
              <textarea 
                className="form-textarea" 
                placeholder="Ej. Zona Industrial, Calle 4, Local 2" 
                value={clientForm.direccion}
                onChange={e => setClientForm({ ...clientForm, direccion: e.target.value })}
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (view === 'details') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{selectedClient.nombre}</h1>
            <p className="page-sub">Teléfono: {selectedClient.telefono || '—'} | Dirección: {selectedClient.direccion || '—'}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setMsg(null); fetchClientes(); }}>Volver al listado</button>
        </div>

        {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 20 }}>{msg.text}</div>}

        <div className="grid-3" style={{ marginBottom: 40, alignItems: 'start' }}>
          {/* Equipos registrados */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Equipos del Cliente ({equipos.length})</h2>
            
            {equipos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                Este cliente no tiene equipos registrados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {equipos.map(eq => {
                  const specs = eq.especificaciones_equipos?.[0] || {};
                  return (
                    <div key={eq.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{eq.nombre}</h3>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Marca: {eq.marca || '—'} | Modelo: {eq.modelo || '—'} | Serial: {eq.serial || '—'}
                          </span>
                        </div>
                        {eq.proximo_mantenimiento && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Próximo mantenimiento</div>
                            <span className="badge badge-blue">{eq.proximo_mantenimiento}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 13, background: 'var(--bg-base)', padding: 12, borderRadius: 'var(--radius)', marginTop: 8 }}>
                        <div><strong>Capacidad:</strong> {eq.capacidad || '—'}</div>
                        <div><strong>Refrigerante:</strong> {eq.refrigerante || '—'}</div>
                        <div><strong>Último mantenimiento:</strong> {eq.ultimo_mantenimiento || '—'}</div>
                        <div />
                      </div>

                      {/* Especificaciones Tecnicas */}
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Especificaciones Técnicas</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 12 }}>
                          <div>Voltaje: <span style={{ color: 'var(--text-secondary)' }}>{specs.voltaje || '—'}</span></div>
                          <div>Amperaje: <span style={{ color: 'var(--text-secondary)' }}>{specs.amperaje || '—'}</span></div>
                          <div>Fases: <span style={{ color: 'var(--text-secondary)' }}>{specs.fases || '—'}</span></div>
                          <div>Compresor: <span style={{ color: 'var(--text-secondary)' }}>{specs.tipo_compresor || '—'}</span></div>
                          <div>P. Alta: <span style={{ color: 'var(--text-secondary)' }}>{specs.presion_alta || '—'}</span></div>
                          <div>P. Baja: <span style={{ color: 'var(--text-secondary)' }}>{specs.presion_baja || '—'}</span></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Formulario agregar equipo */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Agregar Equipo</h2>
            <form onSubmit={handleCreateEquipo}>
              <div className="form-group">
                <label className="form-label">Nombre Identificador *</label>
                <input 
                  className="form-input" 
                  placeholder="Ej. Consola Lobby / Aire Oficina" 
                  value={equipoForm.nombre}
                  onChange={e => setEquipoForm({ ...equipoForm, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input 
                    className="form-input" 
                    placeholder="Samsung" 
                    value={equipoForm.marca}
                    onChange={e => setEquipoForm({ ...equipoForm, marca: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input 
                    className="form-input" 
                    placeholder="AS12UBA" 
                    value={equipoForm.modelo}
                    onChange={e => setEquipoForm({ ...equipoForm, modelo: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Serial</label>
                  <input 
                    className="form-input" 
                    placeholder="SN12345" 
                    value={equipoForm.serial}
                    onChange={e => setEquipoForm({ ...equipoForm, serial: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacidad</label>
                  <input 
                    className="form-input" 
                    placeholder="12000 BTU / 3 TR" 
                    value={equipoForm.capacidad}
                    onChange={e => setEquipoForm({ ...equipoForm, capacidad: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Refrigerante</label>
                <input 
                  className="form-input" 
                  placeholder="R410A / R22" 
                  value={equipoForm.refrigerante}
                  onChange={e => setEquipoForm({ ...equipoForm, refrigerante: e.target.value })}
                />
              </div>
              <div className="grid-2">
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
                  <label className="form-label">Próximo Mantenimiento</label>
                  <input 
                    type="date"
                    className="form-input" 
                    value={equipoForm.proximo_mantenimiento}
                    onChange={e => setEquipoForm({ ...equipoForm, proximo_mantenimiento: e.target.value })}
                  />
                </div>
              </div>

              {/* Especificaciones técnicas en el formulario */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Especificaciones Técnicas</h3>
                
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Voltaje</label>
                    <input 
                      className="form-input" 
                      placeholder="220V" 
                      value={equipoForm.voltaje}
                      onChange={e => setEquipoForm({ ...equipoForm, voltaje: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amperaje</label>
                    <input 
                      className="form-input" 
                      placeholder="5.5 A" 
                      value={equipoForm.amperaje}
                      onChange={e => setEquipoForm({ ...equipoForm, amperaje: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Compresor</label>
                    <input 
                      className="form-input" 
                      placeholder="Rotativo" 
                      value={equipoForm.tipo_compresor}
                      onChange={e => setEquipoForm({ ...equipoForm, tipo_compresor: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fases</label>
                    <input 
                      className="form-input" 
                      placeholder="Monofásico" 
                      value={equipoForm.fases}
                      onChange={e => setEquipoForm({ ...equipoForm, fases: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Presión Alta</label>
                    <input 
                      className="form-input" 
                      placeholder="350 PSI" 
                      value={equipoForm.presion_alta}
                      onChange={e => setEquipoForm({ ...equipoForm, presion_alta: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Presión Baja</label>
                    <input 
                      className="form-input" 
                      placeholder="120 PSI" 
                      value={equipoForm.presion_baja}
                      onChange={e => setEquipoForm({ ...equipoForm, presion_baja: e.target.value })}
                    />
                  </div>
                </div>
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

  // VISTA PRINCIPAL (LISTADO DE CLIENTES)
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
          placeholder="Buscar cliente por nombre o dirección..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" style={{ margin: 'auto', display: 'block', width: 32, height: 32 }} /></div>
      ) : filteredClientes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>No se encontraron clientes.</p>
        </div>
      ) : (
        <div className="grid-2">
          {filteredClientes.map(c => {
            const numEquipos = c.equipos?.length || 0
            return (
              <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>{c.nombre}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📍 {c.direccion || 'Sin dirección'}</div>
                  </div>
                  <span className="badge badge-blue">{numEquipos} equipo{numEquipos !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {c.telefono && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', color: 'var(--success)' }}
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
                    Ver detalles →
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
