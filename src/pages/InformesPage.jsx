import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

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

// Sub-componentes declarados fuera de InformesPage para evitar la re-creación en cada renderizado (pérdida de foco del teclado)
const FieldInput = ({ label, placeholder, required, value, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}{required ? ' *' : ''}</label>
    <input className="form-input" placeholder={placeholder} value={value} onChange={onChange} />
  </div>
)

const FieldTextarea = ({ label, placeholder, rows, required, value, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}{required ? ' *' : ''}</label>
    <textarea className="form-textarea" placeholder={placeholder} rows={rows || 3} value={value} onChange={onChange} />
  </div>
)

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
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

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

  const generarConIA = async (tipo) => {
    if (!aiPrompt.trim()) return
    if (!GEMINI_KEY) {
      if (tipo === 'diagnostico') {
        setField('diagnostico', `[IA no configurada] Diagnóstico técnico sobre: ${aiPrompt}`)
      } else {
        setField('trabajosRealizados', `[IA no configurada] Trabajos ejecutados sobre: ${aiPrompt}`)
      }
      return
    }
    setAiLoading(true)
    try {
      const promptText = tipo === 'diagnostico'
        ? `Eres un técnico profesional de servicio. Redacta un diagnóstico técnico formal y conciso basado en la siguiente avería o síntomas: "${aiPrompt}". Evita hacer listas, viñetas o enumeraciones. Escribe la respuesta únicamente en un párrafo técnico fluido, directo y profesional.`
        : `Eres un técnico profesional de servicio. Redacta una descripción detallada, formal y concisa de los trabajos ejecutados basados en: "${aiPrompt}". Evita hacer listas, viñetas o enumeraciones. Escribe la respuesta únicamente en un párrafo técnico fluido, directo y profesional.`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      )

      const json = await res.json()

      if (!res.ok) {
        console.error('Google API Error:', json)
        throw new Error(json.error?.message || 'Error en Google Gemini API')
      }

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (tipo === 'diagnostico') {
        setField('diagnostico', text.trim())
      } else {
        setField('trabajosRealizados', text.trim())
      }
    } catch (err) {
      console.error('Fetch Error:', err)
      setMsg({ type: 'error', text: 'IA: ' + err.message })
    } finally {
      setAiLoading(false)
    }
  }

  const autocompletarTodoConIA = async () => {
    if (!aiPrompt.trim()) return
    if (!GEMINI_KEY) {
      setField('diagnostico', `[IA no configurada] Diagnóstico técnico sobre: ${aiPrompt}`)
      setField('trabajosRealizados', `[IA no configurada] Trabajos realizados sobre: ${aiPrompt}`)
      setField('materialesUsados', 'Fusible 15A, Cinta aislante, Termoencogible')
      setField('observaciones', 'Se recomienda realizar seguimiento preventivo en 30 días.')
      return
    }
    setAiLoading(true)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Eres un técnico profesional especializado. Basándote en esta descripción: "${aiPrompt}", genera un JSON con las siguientes claves (evita enumeraciones o listas en los valores, escribe solo en párrafos fluidos, concisos y profesionales):
- "diagnostico": Diagnóstico técnico formal de la falla o estado.
- "trabajos": Descripción formal de los trabajos correctivos o preventivos realizados.
- "materiales": Repuestos o consumibles que típicamente se usarían en este caso (en un texto corto y conciso sin viñetas).
- "observaciones": Recomendaciones breves de uso o próximo mantenimiento.

Retorna ÚNICAMENTE el objeto JSON válido de manera estricta, sin bloques de código markdown, sin explicaciones ni rodeos. La respuesta debe iniciar con { y terminar con }.` }] }]
          })
        }
      )

      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || 'Error en Google Gemini API')

      let text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
      // Limpiar posibles bloques de código markdown de Gemini
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim()

      const data = JSON.parse(text)
      setField('diagnostico', data.diagnostico || '')
      setField('trabajosRealizados', data.trabajos || '')
      setField('materialesUsados', data.materiales || '')
      setField('observaciones', data.observaciones || '')
      setMsg({ type: 'success', text: '¡Todos los campos del informe han sido autocompletados con éxito!' })
    } catch (err) {
      console.error('Error al autocompletar con IA:', err)
      setMsg({ type: 'error', text: 'IA Autocompletar: ' + err.message + '. Intenta con un prompt más descriptivo.' })
    } finally {
      setAiLoading(false)
    }
  }

  const guardar = async () => {
    if (!form.cliente || !form.equipo || !form.diagnostico || !form.trabajosRealizados) {
      setMsg({ type: 'error', text: 'Completa: cliente, equipo, diagnóstico y trabajos realizados.' })
      return
    }
    setSaving(true)

    const payload = {
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
    }

    let error;
    if (editingId) {
      const { error: err } = await supabase
        .from('informes')
        .update(payload)
        .eq('id', editingId)
      error = err
    } else {
      const { error: err } = await supabase
        .from('informes')
        .insert(payload)
      error = err
    }

    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: editingId ? 'Informe actualizado.' : 'Informe guardado.' })
      fetchInformes()
      setView('list')
      setForm(defaultForm())
      setEditingId(null)
      setEquipos([])
    }
    setSaving(false)
  }

  const handleEdit = async (inf) => {
    setForm({
      clienteId: inf.cliente_id || '',
      equipoId: inf.equipo_id || '',
      cliente: inf.cliente || '',
      fecha: inf.fecha || '',
      equipo: inf.equipo || '',
      marca: inf.marca || '',
      modelo: inf.modelo || '',
      serial: inf.serial || '',
      diagnostico: inf.diagnostico || '',
      trabajosRealizados: inf.trabajos_realizados || '',
      materialesUsados: inf.materiales_usados || '',
      observaciones: inf.observaciones || '',
      tecnico: inf.tecnico || '',
    })
    if (inf.cliente_id) {
      await fetchEquiposPorCliente(inf.cliente_id)
    }
    setEditingId(inf.id)
    setView('new')
    setMsg(null)
    setAiPrompt('')
  }

  const handleUseAsTemplate = async (inf) => {
    setForm({
      clienteId: inf.cliente_id || '',
      equipoId: inf.equipo_id || '',
      cliente: inf.cliente || '',
      fecha: new Date().toISOString().split('T')[0],
      equipo: inf.equipo || '',
      marca: inf.marca || '',
      modelo: inf.modelo || '',
      serial: inf.serial || '',
      diagnostico: inf.diagnostico || '',
      trabajosRealizados: inf.trabajos_realizados || '',
      materialesUsados: inf.materiales_usados || '',
      observaciones: inf.observaciones || '',
      tecnico: inf.tecnico || '',
    })
    if (inf.cliente_id) {
      await fetchEquiposPorCliente(inf.cliente_id)
    }
    setEditingId(null)
    setView('new')
    setMsg({ type: 'success', text: 'Cargado como plantilla. Modifica y guarda para crear un nuevo informe.' })
    setAiPrompt('')
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

  if (view === 'new') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{editingId ? 'Editar Informe Técnico' : 'Nuevo Informe Técnico'}</h1>
            <p className="page-sub">{editingId ? 'Modifica los datos del informe' : 'Documenta el servicio realizado'}</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setMsg(null); setEditingId(null); setForm(defaultForm()); setEquipos([]); }}>← Volver</button>
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
            <FieldInput label="Cliente" placeholder="Nombre del cliente" value={form.cliente} onChange={e => setField('cliente', e.target.value)} required />
            <FieldInput label="Técnico responsable" placeholder="Tu nombre" value={form.tecnico} onChange={e => setField('tecnico', e.target.value)} />
            <FieldInput label="Fecha" placeholder="" value={form.fecha} onChange={e => setField('fecha', e.target.value)} required />
            <div />
          </div>

          <div className="grid-4" style={{ marginTop: 16 }}>
            <FieldInput label="Equipo / Sistema" placeholder="A/C Split, Cava, etc." value={form.equipo} onChange={e => setField('equipo', e.target.value)} required />
            <FieldInput label="Marca" placeholder="Samsung, Carrier..." value={form.marca} onChange={e => setField('marca', e.target.value)} />
            <FieldInput label="Modelo" placeholder="Modelo del equipo" value={form.modelo} onChange={e => setField('modelo', e.target.value)} />
            <FieldInput label="Serial / N° de serie" placeholder="123456789" value={form.serial} onChange={e => setField('serial', e.target.value)} />
          </div>
        </div>

        {/* ASISTENTE DE REDACCIÓN IA */}
        <div className="card" style={{ marginBottom: 20, background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ⚡ Asistente de Redacción Técnica con IA
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
            Escribe una idea rápida sobre la avería o las tareas que realizaste, luego presiona el botón respectivo para que la IA genere un párrafo formal y sumamente conciso de inmediato.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
            <textarea 
              className="form-textarea" 
              placeholder="Ej: Mantenimiento preventivo a aire split de 12k btu, tenía suciedad y capacitor bajo..." 
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              rows={2}
              style={{ flex: 1, minWidth: '240px', minHeight: '80px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={autocompletarTodoConIA}
                disabled={aiLoading || !aiPrompt.trim()}
                style={{ fontSize: '12px', padding: '10px 14px', flex: 1, margin: 0, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: 'none', color: '#fff', fontWeight: 800 }}
              >
                {aiLoading ? 'Generando...' : '✨ Llenar Todo con IA'}
              </button>
              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => generarConIA('diagnostico')}
                  disabled={aiLoading || !aiPrompt.trim()}
                  style={{ fontSize: '10px', padding: '6px 8px', flex: 1, margin: 0 }}
                >
                  💡 Diagnóstico
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => generarConIA('trabajos')}
                  disabled={aiLoading || !aiPrompt.trim()}
                  style={{ fontSize: '10px', padding: '6px 8px', flex: 1, margin: 0 }}
                >
                  🛠️ Trabajos
                </button>
              </div>
            </div>
          </div>
          {!GEMINI_KEY && (
            <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', margin: '12px 0 0', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style={{ fontSize: '11px' }}>Para habilitar, define <code>VITE_GEMINI_API_KEY</code> en tu <code>.env</code>.</span>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            Detalles del servicio
          </div>
          <FieldTextarea label="Diagnóstico" placeholder="Falla detectada, causa raíz..." value={form.diagnostico} onChange={e => setField('diagnostico', e.target.value)} rows={3} required />
          <FieldTextarea label="Trabajos realizados" placeholder="Describe paso a paso los trabajos ejecutados..." value={form.trabajosRealizados} onChange={e => setField('trabajosRealizados', e.target.value)} rows={4} required />
          <FieldTextarea label="Materiales y repuestos usados" placeholder="Lista de materiales, piezas sustituidas..." value={form.materialesUsados} onChange={e => setField('materialesUsados', e.target.value)} rows={3} />
          <FieldTextarea label="Observaciones / Recomendaciones" placeholder="Sugerencias para el cliente, próximo mantenimiento..." value={form.observaciones} onChange={e => setField('observaciones', e.target.value)} rows={3} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(inf)} style={{ padding: '8px 12px', fontSize: '12px' }}>
                  ✏️ Editar
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleUseAsTemplate(inf)} style={{ padding: '8px 12px', fontSize: '12px' }}>
                  📋 Duplicar
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => descargarPDF(inf)} style={{ padding: '8px 12px', fontSize: '12px' }}>
                  ↓ PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
