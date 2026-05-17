import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    clientesCount: 0,
    equiposCount: 0,
    estaSemanaCount: 0,
    atrasadosCount: 0,
  })
  const [atrasados, setAtrasados] = useState([])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // 1. Obtener clientes del usuario
      const { data: clientes, error: clientesErr } = await supabase
        .from('clientes')
        .select('*')

      if (clientesErr) throw clientesErr

      const clientesIds = (clientes || []).map(c => c.id)

      if (clientesIds.length === 0) {
        setStats({
          clientesCount: 0,
          equiposCount: 0,
          estaSemanaCount: 0,
          atrasadosCount: 0,
        })
        setAtrasados([])
        setLoading(false)
        return
      }

      // 2. Obtener equipos pertenecientes a esos clientes
      const { data: equipos, error: equiposErr } = await supabase
        .from('equipos')
        .select('*, clientes(*)')
        .in('cliente_id', clientesIds)

      if (equiposErr) throw equiposErr

      // 3. Procesar estadísticas
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      const atrasadosList = []
      let estaSemanaCount = 0

      ;(equipos || []).forEach(eq => {
        if (!eq.proximo_mantenimiento) return

        // Parsear fecha y forzar la zona horaria local a las 00:00:00
        const dateParts = eq.proximo_mantenimiento.split('-')
        const fechaProx = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
        fechaProx.setHours(0, 0, 0, 0)

        if (fechaProx < hoy) {
          atrasadosList.push(eq)
        } else {
          const diffDays = (fechaProx - hoy) / 86400000
          if (diffDays >= 0 && diffDays <= 7) {
            estaSemanaCount++
          }
        }
      })

      setStats({
        clientesCount: clientes.length,
        equiposCount: equipos.length,
        estaSemanaCount,
        atrasadosCount: atrasadosList.length,
      })
      setAtrasados(atrasadosList)
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Panel de Control</h1>
        <p className="page-sub">Bienvenido, {user?.email} — {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Clientes</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.clientesCount}</div>
          <div className="stat-sub">registrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Equipos</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.equiposCount}</div>
          <div className="stat-sub">activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Esta semana</div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>{stats.estaSemanaCount}</div>
          <div className="stat-sub">mantenimientos</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Atrasados</div>
          <div className="stat-value" style={{ color: '#f87171' }}>{stats.atrasadosCount}</div>
          <div className="stat-sub">requieren atención</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Equipos con atención urgente</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mantenimientos atrasados</div>
          </div>
          {stats.atrasadosCount > 0 && <span className="badge" style={{ background: '#fef2f2', color: '#ef4444' }}>{stats.atrasadosCount} alertas</span>}
        </div>

        {atrasados.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
            Todo al día. Sin mantenimientos atrasados.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipo / Cliente</th>
                  <th>Marca / Modelo</th>
                  <th>Fecha programada</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {atrasados.map(eq => {
                  const cliente = eq.clientes
                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{eq.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cliente?.nombre}</div>
                      </td>
                      <td>{eq.marca || '—'} · {eq.modelo || '—'}</td>
                      <td>
                        <span className="badge" style={{ background: '#fef2f2', color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
                          {eq.proximo_mantenimiento}
                        </span>
                      </td>
                      <td>
                        {cliente?.telefono && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--success)' }}
                            onClick={() => window.open(`https://wa.me/${cliente.telefono}?text=Hola ${cliente.nombre}, le contactamos para programar el mantenimiento de su equipo ${eq.nombre} (${eq.marca || ''}).`, '_blank')}
                          >
                            WhatsApp
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
