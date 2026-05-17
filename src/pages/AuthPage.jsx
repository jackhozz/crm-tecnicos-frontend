import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
        if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres')
        const { data, error } = await signUp(email, password)
        if (error) throw error
        
        // Si el usuario se creó pero requiere confirmación
        if (data?.user && data?.session === null) {
          setSuccess('¡Cuenta creada! Revisa tu correo para confirmar (o desactiva "Confirm Email" en Supabase).')
        } else {
          setSuccess('¡Cuenta creada exitosamente!')
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
          <img src="/logo.png" alt="Mantenizapp Logo" style={{ height: '70px', objectFit: 'contain', marginBottom: '16px' }} />
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

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Juan Pérez"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
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

          <div className="form-group" style={{ marginBottom: 24 }}>
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
