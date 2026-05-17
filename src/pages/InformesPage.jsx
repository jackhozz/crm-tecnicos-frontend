import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const defaultForm = () => ({
  clienteId: '',
  equipoId: '',
  cliente: '',
  fecha: new Date().toISOString().split('T')[0],
  equipo: '',
  marca: '',
  modelo: '',
  serial: '',
  diagnostico: '',
  trabajosRealizados: '',
  materialesUsados: '',
  observaciones: '',
  tecnico: '',
})

export default function InformesPage() {
  const { user } = useAuth()
  const [form, setForm] = useState(defaultForm())
  const [informes, setInformes] = useState([])
  const [clientes, setClientes] = useState([])
  const [equipos, setEquipos] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('list')

  useEffect(() => {
    fetchInformes()
    fetchClientes()
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setField('tecnico', `${data.nombre || ''} ${data.apellido || ''}`.trim() || user?.email)
      } else {
        setField('tecnico', user?.email || '')
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err)
    }
  }

  const fetchInformes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('informes')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
    setInformes(data || [])
    setLoading(false)
  }

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true })
    setClientes(data || [])
  }

  const fetchEquiposPorCliente = async (clienteId) => {
    if (!clienteId) {
      setEquipos([])
      return
    }
    const { data } = await supabase
      .from('equipos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('nombre', { ascending: true })
    setEquipos(data || [])
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.cliente || !form.equipo || !form.diagnostico || !form.trabajosRealizados) {
      setMsg({ type: 'error', text: 'Completa: cliente, equipo, diagnóstico y trabajos realizados.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('informes').insert({
      cliente_id: form.clienteId || null,
      equipo_id: form.equipoId || null,
      cliente: form.cliente,
      fecha: form.fecha,
      equipo: form.equipo,
      marca: form.marca,
      modelo: form.modelo,
      serial: form.serial,
      diagnostico: form.diagnostico,
      trabajos_realizados: form.trabajosRealizados,
      materiales_usados: form.materialesUsados,
      observaciones: form.observaciones,
      tecnico: form.tecnico,
      user_id: user.id,
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Informe guardado.' })
      fetchInformes()
      setView('list')
      setForm(defaultForm())
      setEquipos([])
    }
    setSaving(false)
  }

  const descargarPDF = async (data) => {
    // Intentar buscar los datos del perfil del emisor para más formalidad técnica
    let techDoc = ''
    let techProf = ''
    try {
      const { data: profile } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', data.user_id || user.id)
        .maybeSingle()
      if (profile) {
        techDoc = profile.documento_identidad ? `Doc. Identidad: ${profile.documento_identidad}` : ''
        techProf = profile.grado_profesion || ''
      }
    } catch (err) {
      console.error('Error cargando perfil para el PDF:', err)
    }

    const doc = new jsPDF()

    // Cabecera Minimalista
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('INFORME TÉCNICO DE SERVICIO', 14, 20)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139) // Slate gray
    if (techProf) {
      doc.text(techProf.toUpperCase(), 14, 25)
    }
    
    // Thin separating technical line
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.8)
    doc.line(14, 29, 196, 29)

    // Document Meta (Nro y Fecha)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`INFORME N° ${String(data.id || 'S/N').substring(0, 8).toUpperCase()}`, 142, 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Fecha Emisión: ${data.fecha}`, 142, 25)

    doc.setTextColor(0, 0, 0)
    let y = 35

    // Datos del equipo / servicio
    autoTable(doc, {
      startY: y,
      head: [['INFORMACIÓN DEL SERVICIO Y EQUIPO', '']],
      body: [
        ['Cliente / Solicitante', data.cliente],
        ['Equipo / Sistema', data.equipo],
        ['Marca / Modelo', `${data.marca || '—'} / ${data.modelo || '—'}`],
        ['Serial / Código', data.serial || '—'],
        ['Técnico Responsable', data.tecnico || '—'],
      ],
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', fontSize: 8.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [241, 245, 249] } },
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: [220, 220, 220], lineWidth: 0.1 },
      theme: 'grid'
    })
    y = doc.lastAutoTable.finalY + 10

    // Diagnóstico
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('1. DIAGNÓSTICO TÉCNICO', 14, y)
    doc.setLineWidth(0.4)
    doc.setDrawColor(0, 0, 0)
    doc.line(14, y + 2, 29, y + 2)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    const diagLines = doc.splitTextToSize(data.diagnostico || '—', 182)
    doc.text(diagLines, 14, y + 8)
    y += 8 + diagLines.length * 5.2 + 4

    // Check for page overflow
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    // Trabajos
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text('2. TRABAJOS REALIZADOS', 14, y)
    doc.line(14, y + 2, 29, y + 2)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    const trabLines = doc.splitTextToSize(data.trabajos_realizados || data.trabajosRealizados || '—', 182)
    doc.text(trabLines, 14, y + 8)
    y += 8 + trabLines.length * 5.2 + 4

    // Check for page overflow
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    // Materiales
    if (data.materiales_usados || data.materialesUsados) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('3. REPUESTOS Y MATERIALES UTILIZADOS', 14, y)
      doc.line(14, y + 2, 29, y + 2)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      const matLines = doc.splitTextToSize(data.materiales_usados || data.materialesUsados, 182)
      doc.text(matLines, 14, y + 8)
      y += 8 + matLines.length * 5.2 + 4
    }

    // Check for page overflow
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    // Observaciones
    if (data.observaciones) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('4. OBSERVACIONES Y RECOMENDACIONES', 14, y)
      doc.line(14, y + 2, 29, y + 2)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(51, 65, 85)
      const obsLines = doc.splitTextToSize(data.observaciones, 182)
      doc.text(obsLines, 14, y + 8)
      y += 8 + obsLines.length * 5.2 + 4
    }

    // Firmas
    y += 12
    
    // Safety check for multi-page overflow
    if (y > 250) {
      doc.addPage()
      y = 30
    }
    
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(14, y, 80, y)
    doc.line(130, y, 196, y)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(data.tecnico || 'Firma del Técnico Responsable', 14, y + 5)
    if (techProf) {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(techProf, 14, y + 9)
    }
    if (techDoc) {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(techDoc, 14, y + 13)
    }

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Firma de Conformidad Cliente', 130, y + 5)

    doc.save(`informe_${data.cliente?.replace(/\s+/g, '_') || 'informe'}_${data.fecha}.pdf`)
  }

  const FieldInput = ({ label, field, placeholder, required }) => (
    <div className="form-group">
      <label className="form-label">{label}{required ? ' *' : ''}</label>
      <input className="form-input" placeholder={placeholder} value={form[field]} onChange={e => setField(field, e.target.value)} />
    </div>
  )

  const FieldTextarea = ({ label, field, placeholder, rows, required }) => (
    <div className="form-group">
      <label className="form-label">{label}{required ? ' *' : ''}</label>
      <textarea className="form-textarea" placeholder={placeholder} rows={rows || 3} value={form[field]} onChange={e => setField(field, e.target.value)} />
    </div>
  )

  if (view === 'new') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Nuevo Informe Técnico</h1>
            <p className="page-sub">Documenta el servicio realizado</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setMsg(null) }}>← Volver</button>
        </div>

        {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 20 }}>{msg.text}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--accent)' }}>📋 Datos del cliente y equipo</div>
          
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Vincular Cliente (Directorio)</label>
              <select
                className="form-input"
                value={form.clienteId}
                onChange={async e => {
                  const cid = e.target.value
                  const selected = clientes.find(c => c.id === cid)
                  setForm(f => ({
                    ...f,
                    clienteId: cid,
                    cliente: selected ? selected.nombre : '',
                    equipoId: '',
                    equipo: '',
                    marca: '',
                    modelo: '',
                    serial: ''
                  }))
                  await fetchEquiposPorCliente(cid)
                }}
              >
                <option value="">-- Escribir manual --</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Seleccionar Equipo Vinculado</label>
              <select
                className="form-input"
                value={form.equipoId}
                disabled={!form.clienteId}
                onChange={e => {
                  const eid = e.target.value
                  const selected = equipos.find(eq => eq.id === eid)
                  setForm(f => ({
                    ...f,
                    equipoId: eid,
                    equipo: selected ? (selected.nombre || selected.tipo || 'Equipo') : '',
                    marca: selected ? (selected.marca || '') : '',
                    modelo: selected ? (selected.modelo || '') : '',
                    serial: selected ? (selected.serial || '') : ''
                  }))
                }}
              >
                <option value="">-- Cargar manual / Ninguno --</option>
                {equipos.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.nombre || eq.tipo || 'Equipo'} ({eq.marca || 'Sin marca'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <FieldInput label="Cliente" field="cliente" placeholder="Nombre del cliente" required />
            <FieldInput label="Técnico responsable" field="tecnico" placeholder="Tu nombre" />
            <FieldInput label="Fecha" field="fecha" placeholder="" required />
            <div />
          </div>

          <div className="grid-4" style={{ marginTop: 16 }}>
            <FieldInput label="Equipo / Sistema" field="equipo" placeholder="A/C Split, Cava, etc." required />
            <FieldInput label="Marca" field="marca" placeholder="Samsung, Carrier..." />
            <FieldInput label="Modelo" field="modelo" placeholder="Modelo del equipo" />
            <FieldInput label="Serial / N° de serie" field="serial" placeholder="123456789" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Detalles del servicio
          </div>
          <FieldTextarea label="Diagnóstico" field="diagnostico" placeholder="Falla detectada, causa raíz..." rows={3} required />
          <FieldTextarea label="Trabajos realizados" field="trabajosRealizados" placeholder="Describe paso a paso los trabajos ejecutados..." rows={4} required />
          <FieldTextarea label="Materiales y repuestos usados" field="materialesUsados" placeholder="Lista de materiales, piezas sustituidas..." rows={3} />
          <FieldTextarea label="Observaciones / Recomendaciones" field="observaciones" placeholder="Sugerencias para el cliente, próximo mantenimiento..." rows={3} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={guardar} disabled={saving}>
            {saving ? <span className="spinner" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            )}
            {saving ? 'Guardando...' : 'Guardar informe'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Informes Técnicos</h1>
          <p className="page-sub">{informes.length} informes guardados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setView('new'); setMsg(null) }}>+ Nuevo Informe</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" style={{ margin: 'auto', display: 'block', width: 32, height: 32 }} /></div>
      ) : informes.length === 0 ? (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
          <div className="empty-icon" style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <p>Sin informes aún. Crea el primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {informes.map(inf => (
            <div key={inf.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{inf.equipo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {inf.fecha} · Cliente: {inf.cliente} {inf.clientes && <span style={{ marginLeft: 6, padding: '2px 6px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Directorio</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 500 }} className="text-truncate">
                  {inf.diagnostico?.substring(0, 100)}...
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => descargarPDF(inf)}>
                ↓ PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
