import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const defaultForm = () => ({
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('list')

  useEffect(() => { fetchInformes() }, [])

  const fetchInformes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('informes')
      .select('*')
      .order('created_at', { ascending: false })
    setInformes(data || [])
    setLoading(false)
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.cliente || !form.equipo || !form.diagnostico || !form.trabajosRealizados) {
      setMsg({ type: 'error', text: 'Completa: cliente, equipo, diagnóstico y trabajos realizados.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('informes').insert({
      ...form,
      user_id: user.id,
    })
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Informe guardado.' })
      fetchInformes()
      setView('list')
      setForm(defaultForm())
    }
    setSaving(false)
  }

  const descargarPDF = (data) => {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(3, 105, 161)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('❄ TermoControl Hub', 14, 18)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('INFORME TÉCNICO DE SERVICIO', 14, 28)
    doc.text(`N° ${data.id || 'S/N'}  |  Fecha: ${data.fecha}`, 14, 36)

    doc.setTextColor(30, 30, 30)
    let y = 52

    // Datos del equipo
    autoTable(doc, {
      startY: y,
      head: [['DATOS DEL SERVICIO', '']],
      body: [
        ['Cliente', data.cliente],
        ['Equipo', data.equipo],
        ['Marca / Modelo', `${data.marca || '—'} / ${data.modelo || '—'}`],
        ['Serial', data.serial || '—'],
        ['Técnico', data.tecnico || '—'],
      ],
      headStyles: { fillColor: [3, 105, 161], textColor: 255, fontStyle: 'bold', halign: 'left' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      styles: { fontSize: 10 },
    })
    y = doc.lastAutoTable.finalY + 8

    // Diagnóstico
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('DIAGNÓSTICO', 14, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const diagLines = doc.splitTextToSize(data.diagnostico || '—', 180)
    doc.text(diagLines, 14, y + 14)
    y += 14 + diagLines.length * 6

    // Trabajos
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('TRABAJOS REALIZADOS', 14, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const trabLines = doc.splitTextToSize(data.trabajos_realizados || data.trabajosRealizados || '—', 180)
    doc.text(trabLines, 14, y + 16)
    y += 16 + trabLines.length * 6

    // Materiales
    if (data.materiales_usados || data.materialesUsados) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('MATERIALES USADOS', 14, y + 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const matLines = doc.splitTextToSize(data.materiales_usados || data.materialesUsados, 180)
      doc.text(matLines, 14, y + 16)
      y += 16 + matLines.length * 6
    }

    // Observaciones
    if (data.observaciones) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('OBSERVACIONES', 14, y + 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const obsLines = doc.splitTextToSize(data.observaciones, 180)
      doc.text(obsLines, 14, y + 16)
      y += 16 + obsLines.length * 6
    }

    // Firmas
    y += 20
    doc.setDrawColor(180, 180, 180)
    doc.line(14, y, 80, y)
    doc.line(130, y, 196, y)
    doc.setFontSize(9)
    doc.text('Firma del técnico', 14, y + 6)
    doc.text('Firma del cliente', 130, y + 6)

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
          <div className="grid-2">
            <FieldInput label="Cliente" field="cliente" placeholder="Nombre del cliente" required />
            <FieldInput label="Técnico responsable" field="tecnico" placeholder="Tu nombre" />
            <FieldInput label="Fecha" field="fecha" placeholder="" />
            <div />
          </div>
          <div className="grid-3">
            <FieldInput label="Tipo de equipo" field="equipo" placeholder="A/C Split, Cava, etc." required />
            <FieldInput label="Marca" field="marca" placeholder="Samsung, Carrier..." />
            <FieldInput label="Modelo" field="modelo" placeholder="Modelo del equipo" />
            <FieldInput label="Serial / N° de serie" field="serial" placeholder="123456789" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: 'var(--accent)' }}>🔧 Detalles del servicio</div>
          <FieldTextarea label="Diagnóstico" field="diagnostico" placeholder="Falla detectada, causa raíz..." rows={3} required />
          <FieldTextarea label="Trabajos realizados" field="trabajosRealizados" placeholder="Describe paso a paso los trabajos ejecutados..." rows={4} required />
          <FieldTextarea label="Materiales y repuestos usados" field="materialesUsados" placeholder="Lista de materiales, piezas sustituidas..." rows={3} />
          <FieldTextarea label="Observaciones / Recomendaciones" field="observaciones" placeholder="Sugerencias para el cliente, próximo mantenimiento..." rows={3} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={guardar} disabled={saving}>
            {saving ? <span className="spinner" /> : '💾'}
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
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>Sin informes aún. Crea el primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {informes.map(inf => (
            <div key={inf.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{inf.equipo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {inf.fecha} · Cliente: {inf.cliente}
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
