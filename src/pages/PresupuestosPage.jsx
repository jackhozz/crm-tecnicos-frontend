import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

const emptyItem = () => ({ id: Date.now(), descripcion: '', precio: '' })

const defaultForm = () => ({
  clienteId: '',
  nombreEmisor: '',
  nombreReceptor: '',
  fecha: new Date().toISOString().split('T')[0],
  titulo: '',
  descripcionObra: '',
  items: [emptyItem()],
})

export default function PresupuestosPage() {
  const { user } = useAuth()
  const [form, setForm] = useState(defaultForm())
  const [presupuestos, setPresupuestos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'new'

  useEffect(() => {
    fetchPresupuestos()
    fetchClientes()
  }, [])

  const fetchPresupuestos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('presupuestos')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
    setPresupuestos(data || [])
    setLoading(false)
  }

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true })
    setClientes(data || [])
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))
  const removeItem = (id) => setForm(f => ({ ...f, items: f.items.filter(i => i.id !== id) }))
  const updateItem = (id, k, v) => setForm(f => ({
    ...f,
    items: f.items.map(i => i.id === id ? { ...i, [k]: v } : i)
  }))

  const total = form.items.reduce((s, i) => s + (parseFloat(i.precio) || 0), 0)

  const generarConIA = async () => {
    if (!aiPrompt.trim()) return
    if (!GEMINI_KEY) {
      setField('descripcionObra', `[IA no configurada] Resumen: ${aiPrompt}`)
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
            contents: [{ parts: [{ text: `Eres un técnico profesional. Redacta una descripción técnica formal para un presupuesto basada en: "${aiPrompt}". Solo el texto.` }] }]
          })
        }
      )

      const json = await res.json()

      if (!res.ok) {
        console.error('Google API Error:', json)
        throw new Error(json.error?.message || 'Error desconocido en Google')
      }

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
      setField('descripcionObra', text.trim())
    } catch (err) {
      console.error('Fetch Error:', err)
      setMsg({ type: 'error', text: 'IA: ' + err.message })
    } finally {
      setAiLoading(false)
    }
  }

  const guardar = async () => {
    if (!form.nombreReceptor || !form.titulo || form.items.some(i => !i.descripcion)) {
      setMsg({ type: 'error', text: 'Completa receptor, título y descripción de todos los ítems.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('presupuestos').insert({
      cliente_id: form.clienteId || null,
      nombre_emisor: form.nombreEmisor,
      nombre_receptor: form.nombreReceptor,
      fecha: form.fecha,
      titulo: form.titulo,
      descripcion_obra: form.descripcionObra,
      items: form.items,
      total,
      user_id: user.id,
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Presupuesto guardado.' })
      fetchPresupuestos()
      setView('list')
      setForm(defaultForm())
    }
    setSaving(false)
  }

  const descargarPDF = (data) => {
    const doc = new jsPDF()
    const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items

    // Header Background - slate-900 (#0f172a)
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, 210, 42, 'F')

    // Header Branding
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('⚡ Mantenizapp', 14, 18)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text('SISTEMA INTEGRAL DE MANTENIMIENTO Y CONTROL', 14, 26)
    doc.text('PRESUPUESTO TÉCNICO', 14, 34)

    // Document Meta
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`PRESUPUESTO N° ${String(data.id || 'S/N').substring(0, 8).toUpperCase()}`, 145, 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text(`Fecha: ${data.fecha}`, 145, 26)

    doc.setTextColor(15, 23, 42)

    // Cliente & Emisor details in a nice card look
    let y = 52
    doc.setDrawColor(226, 232, 240) // slate-200
    doc.setFillColor(248, 250, 252) // slate-50
    doc.roundedRect(14, y, 182, 34, 4, 4, 'FD')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('INFORMACIÓN GENERAL', 20, y + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(`Técnico Emisor: ${data.nombre_emisor || '—'}`, 20, y + 16)
    doc.text(`Cliente / Receptor: ${data.nombre_receptor}`, 20, y + 24)
    
    // Título en la parte derecha
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Trabajo a Realizar:', 110, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    const titleLines = doc.splitTextToSize(data.titulo || '—', 80)
    doc.text(titleLines, 110, y + 16)

    y += 44

    // Descripción
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('DETALLE Y DESCRIPCIÓN DE LA OBRA', 14, y)
    
    // Underline accent bar
    doc.setFillColor(59, 130, 246) // blue-500
    doc.rect(14, y + 2, 20, 1, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(71, 85, 105) // slate-600
    const descLines = doc.splitTextToSize(data.descripcion_obra || '—', 182)
    doc.text(descLines, 14, y + 10)
    
    const afterDesc = y + 10 + descLines.length * 5.5

    // Tabla de items
    autoTable(doc, {
      startY: afterDesc + 8,
      head: [['#', 'Descripción del Trabajo / Materiales', 'Monto (USD)']],
      body: items.map((it, i) => [i + 1, it.descripcion, `$${parseFloat(it.precio || 0).toFixed(2)}`]),
      foot: [['', 'VALOR TOTAL DEL PRESUPUESTO', `$${parseFloat(data.total || 0).toFixed(2)}`]],
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: [239, 246, 255], textColor: [29, 78, 216], fontStyle: 'bold', fontSize: 10 }, // Blue-50 theme
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 5 },
      theme: 'striped'
    })

    // Términos & Firma
    const finalY = doc.lastAutoTable.finalY + 16
    
    // Terms & Conditions block
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text('Nota: Este presupuesto tiene una validez de 15 días a partir de la fecha de emisión. Los precios incluyen materiales y mano de obra especificados.', 14, finalY)

    // Signature
    const sigY = finalY + 18
    doc.setDrawColor(203, 213, 225) // slate-300
    doc.line(14, sigY, 70, sigY)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Firma del Técnico Autorizado', 14, sigY + 5)
    
    doc.save(`presupuesto_${data.titulo?.replace(/\s+/g, '_') || 'doc'}.pdf`)
  }

  // ---- VIEWS ----
  if (view === 'new') {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Nuevo Presupuesto</h1>
            <p className="page-sub">Completa los datos y guarda</p>
          </div>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setMsg(null) }}>← Volver</button>
        </div>

        {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'} style={{ marginBottom: 20 }}>{msg.text}</div>}

        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nombre Emisor (técnico)</label>
            <input className="form-input" placeholder="Tu nombre o empresa" value={form.nombreEmisor} onChange={e => setField('nombreEmisor', e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Vincular Cliente (Directorio)</label>
            <select
              className="form-input"
              value={form.clienteId}
              onChange={e => {
                const cid = e.target.value
                const selected = clientes.find(c => c.id === cid)
                setForm(f => ({
                  ...f,
                  clienteId: cid,
                  nombreReceptor: selected ? selected.nombre : ''
                }))
              }}
            >
              <option value="">-- Escribir manual abajo --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nombre Receptor (cliente) *</label>
            <input className="form-input" placeholder="Nombre del cliente" value={form.nombreReceptor} onChange={e => setField('nombreReceptor', e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Fecha *</label>
            <input type="date" className="form-input" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
            <label className="form-label">Título del presupuesto *</label>
            <input className="form-input" placeholder="Ej: Mantenimiento A/C Samsung 12000 BTU" value={form.titulo} onChange={e => setField('titulo', e.target.value)} />
          </div>
        </div>

        {/* IA Section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Descripción de obra con IA</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Describe brevemente lo que hiciste y la IA redacta el texto formal</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input
              className="form-input"
              placeholder="Ej: Cambié capacitor, limpié serpentines, recargué 1kg R410A..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-ai" onClick={generarConIA} disabled={aiLoading || !aiPrompt.trim()}>
              {aiLoading ? <span className="spinner" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              )}
              {aiLoading ? 'Generando...' : 'Generar'}
            </button>
          </div>
          {!GEMINI_KEY && (
            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Agrega <code>VITE_GEMINI_API_KEY</code> en el .env para activar la IA.</span>
            </div>
          )}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Descripción de obra</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="La descripción generada por IA aparecerá aquí, o escríbela manualmente..."
              value={form.descripcionObra}
              onChange={e => setField('descripcionObra', e.target.value)}
            />
          </div>
        </div>

        {/* Items */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Ítems / Materiales</div>
            <button className="btn btn-secondary btn-sm" onClick={addItem}>+ Agregar ítem</button>
          </div>
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: '60%' }}>Descripción</th>
                <th>Precio (USD)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map(item => (
                <tr key={item.id}>
                  <td><input placeholder="Descripción del ítem..." value={item.descripcion} onChange={e => updateItem(item.id, 'descripcion', e.target.value)} /></td>
                  <td><input type="number" placeholder="0.00" value={item.precio} onChange={e => updateItem(item.id, 'precio', e.target.value)} style={{ maxWidth: 120 }} /></td>
                  <td>
                    {form.items.length > 1 && (
                      <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.id)}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="total-row">
            <div className="total-box">
              <div className="total-label">Total presupuestado</div>
              <div className="total-value">${total.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={guardar} disabled={saving}>
            {saving ? <span className="spinner" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            )}
            {saving ? 'Guardando...' : 'Guardar presupuesto'}
          </button>
        </div>
      </div>
    )
  }

  // LIST VIEW
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Presupuestos</h1>
          <p className="page-sub">{presupuestos.length} documentos guardados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setView('new'); setMsg(null) }}>+ Nuevo Presupuesto</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" style={{ margin: 'auto', display: 'block', width: 32, height: 32 }} /></div>
      ) : presupuestos.length === 0 ? (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
          <div className="empty-icon" style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <p>Aún no hay presupuestos. Crea el primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {presupuestos.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{p.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {p.fecha} · Para: {p.nombre_receptor} {p.clientes && <span style={{ marginLeft: 6, padding: '2px 6px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>Directorio</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>${parseFloat(p.total || 0).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => descargarPDF(p)}>
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
