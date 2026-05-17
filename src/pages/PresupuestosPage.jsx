import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

const emptyItem = () => ({ id: Date.now(), descripcion: '', precio: '' })

const defaultForm = () => ({
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
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'new'

  useEffect(() => { fetchPresupuestos() }, [])

  const fetchPresupuestos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('presupuestos')
      .select('*')
      .order('created_at', { ascending: false })
    setPresupuestos(data || [])
    setLoading(false)
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

    // Header
    doc.setFillColor(3, 105, 161)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('❄ TermoControl Hub', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('PRESUPUESTO TÉCNICO', 14, 30)
    doc.text(`N° ${data.id || 'S/N'}`, 160, 20)
    doc.text(`Fecha: ${data.fecha}`, 160, 30)

    doc.setTextColor(30, 30, 30)

    // Datos
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL PRESUPUESTO', 14, 55)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Emisor: ${data.nombre_emisor || '—'}`, 14, 63)
    doc.text(`Receptor: ${data.nombre_receptor}`, 14, 71)
    doc.text(`Título: ${data.titulo}`, 14, 79)

    // Descripción
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('DESCRIPCIÓN DE OBRA', 14, 93)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const descLines = doc.splitTextToSize(data.descripcion_obra || '—', 180)
    doc.text(descLines, 14, 101)
    const afterDesc = 101 + descLines.length * 6

    // Tabla de items
    autoTable(doc, {
      startY: afterDesc + 6,
      head: [['#', 'Descripción', 'Precio (USD)']],
      body: items.map((it, i) => [i + 1, it.descripcion, `$${parseFloat(it.precio || 0).toFixed(2)}`]),
      foot: [['', 'TOTAL', `$${parseFloat(data.total || 0).toFixed(2)}`]],
      headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 244, 248], textColor: [3, 105, 161], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 10 },
    })

    // Firma
    const finalY = doc.lastAutoTable.finalY + 20
    doc.setDrawColor(200, 200, 200)
    doc.line(14, finalY, 80, finalY)
    doc.setFontSize(9)
    doc.text('Firma del técnico', 14, finalY + 6)

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
            <label className="form-label">Nombre Receptor (cliente) *</label>
            <input className="form-input" placeholder="Nombre del cliente" value={form.nombreReceptor} onChange={e => setField('nombreReceptor', e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Fecha *</label>
            <input type="date" className="form-input" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Título del presupuesto *</label>
            <input className="form-input" placeholder="Ej: Mantenimiento A/C Samsung 12000 BTU" value={form.titulo} onChange={e => setField('titulo', e.target.value)} />
          </div>
        </div>

        {/* IA Section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>✨</span>
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
              {aiLoading ? <span className="spinner" /> : '✨'}
              {aiLoading ? 'Generando...' : 'Generar'}
            </button>
          </div>
          {!GEMINI_KEY && (
            <div className="alert alert-warning">⚠️ Agrega <code>VITE_GEMINI_API_KEY</code> en el .env para activar la IA.</div>
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
            {saving ? <span className="spinner" /> : '💾'}
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
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <p>Aún no hay presupuestos. Crea el primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {presupuestos.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{p.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {p.fecha} · Para: {p.nombre_receptor}
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
