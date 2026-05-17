import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabase'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New Profile Registration Fields
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [documentoIdentidad, setDocumentoIdentidad] = useState('')
  const [gradoProfesion, setGradoProfesion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [competencias, setCompetencias] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (tab === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
      } else {
        if (!nombre.trim()) throw new Error('El nombre es obligatorio')
        if (!apellido.trim()) throw new Error('El apellido es obligatorio')
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
        
        const { data, error } = await signUp(email, password)
        if (error) throw error
        
        // Save initial profile details if signup succeeded
        if (data?.user) {
          const { error: profileError } = await supabase
            .from('perfiles')
            .upsert({
              id: data.user.id,
              nombre: nombre.trim(),
              apellido: apellido.trim(),
              documento_identidad: documentoIdentidad.trim(),
              grado_profesion: gradoProfesion.trim(),
              telefono: telefono.trim(),
              correo_profesional: email.trim(),
              competencias: competencias.trim()
            })
          if (profileError) {
            console.error('Error insertando perfil inicial:', profileError)
          }
        }

        // Si el usuario se creó pero requiere confirmación
        if (data?.user && data?.session === null) {
          setSuccess('¡Cuenta creada! Revisa tu correo para confirmar (o desactiva "Confirm Email" en Supabase).')
        } else {
          setSuccess('¡Cuenta creada exitosamente!')
          
          // Clear registration fields
          setNombre('')
          setApellido('')
          setDocumentoIdentidad('')
          setGradoProfesion('')
          setTelefono('')
          setCompetencias('')
          
          setTab('login')
        }
      }
    } catch (err) {
      // Mensajes amigables
      const errorMap = {
        'Invalid login credentials': 'Correo o contraseña incorrectos.',
        'User already registered': 'Este correo ya está registrado.',
        'Email not confirmed': 'Debes confirmar tu correo electrónico.',
        'Signup is disabled': 'El registro está desactivado en Supabase.',
      }
      setError(errorMap[err.message] || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />

      <div className="auth-card">
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo.png" alt="Mantenizapp Logo" style={{ height: '70px', objectFit: 'contain', marginBottom: '12px' }} />
          <h1>Mantenizapp</h1>
          <p>Gestión de clientes y equipos</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess('') }}>
            Iniciar Sesión
          </button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setSuccess('') }}>
            Registrarse
          </button>
        </div>

        {error && (
          <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tab === 'register' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Juan"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Apellido *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pérez"
                    value={apellido}
                    onChange={e => setApellido(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Documento de Identidad (Cédula/DNI)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: V-12345678"
                  value={documentoIdentidad}
                  onChange={e => setDocumentoIdentidad(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Grado Académico o Profesión</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Técnico Frigorista Superior"
                  value={gradoProfesion}
                  onChange={e => setGradoProfesion(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Teléfono Profesional</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: +58 412 1234567"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Especialidades / Competencias</label>
                <textarea
                  className="form-textarea"
                  placeholder="Ej: Reparación de Cavas, Mantenimiento de Chiller, A/C Inverter..."
                  value={competencias}
                  onChange={e => setCompetencias(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Correo electrónico</label>
            <input
              type="email"
              className="form-input"
              placeholder="tecnico@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0, marginBottom: 10 }}>
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Procesando...' : tab === 'login' ? '→ Entrar al sistema' : '✓ Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
