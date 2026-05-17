import React from 'react'
import { useAuth } from '../contexts/AuthContext'

const mockClientes = [
  { id: 1, nombre: 'Juan Pérez', telefono: '584121234567', direccion: 'Av. Las Delicias, Maracay' },
  { id: 2, nombre: 'Empresa Frío C.A.', telefono: '584149876543', direccion: 'Zona Industrial, Valencia' },
]

const mockEquipos = [
  { id: 101, clienteId: 1, tipo: 'Aire Acondicionado Split', marca: 'Samsung', capacidad: '12000 BTU', proximoMantenimiento: '2026-02-10' },
  { id: 102, clienteId: 2, tipo: 'Cava Cuarto', marca: 'Carrier', capacidad: '5 Toneladas', proximoMantenimiento: '2026-05-15' },
  { id: 103, clienteId: 2, tipo: 'Exhibidor', marca: 'Boreal', capacidad: '2 Puertas', proximoMantenimiento: '2026-02-01' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const hoy = new Date()
  const atrasados = mockEquipos.filter(eq => new Date(eq.proximoMantenimiento) < hoy)
  const estaSemana = mockEquipos.filter(eq => {
    const d = (new Date(eq.proximoMantenimiento) - hoy) / 86400000
    return d >= 0 && d <= 7
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Panel de Control</h1>
        <p className="page-sub">Bienvenido, {user?.email} — {new Date().toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-glow" style={{ background: '#38bdf8' }} />
          <div className="stat-label">Clientes</div>
          <div className="stat-value" style={{ color: '#38bdf8' }}>{mockClientes.length}</div>
          <div className="stat-sub">registrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-glow" style={{ background: '#818cf8' }} />
          <div className="stat-label">Equipos</div>
          <div className="stat-value" style={{ color: '#818cf8' }}>{mockEquipos.length}</div>
          <div className="stat-sub">activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-glow" style={{ background: '#fbbf24' }} />
          <div className="stat-label">Esta semana</div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>{estaSemana.length}</div>
          <div className="stat-sub">mantenimientos</div>
        </div>
        <div className="stat-card">
          <div className="stat-glow" style={{ background: '#f87171' }} />
          <div className="stat-label">Atrasados</div>
          <div className="stat-value" style={{ color: '#f87171' }}>{atrasados.length}</div>
          <div className="stat-sub">requieren atención</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Equipos con atención urgente</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mantenimientos atrasados</div>
          </div>
          {atrasados.length > 0 && <span className="badge badge-red">🔴 {atrasados.length} alertas</span>}
        </div>

        {atrasados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>Todo al día. Sin mantenimientos atrasados.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipo / Cliente</th>
                  <th>Marca</th>
                  <th>Fecha programada</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {atrasados.map(eq => {
                  const cliente = mockClientes.find(c => c.id === eq.clienteId)
                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{eq.tipo}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cliente?.nombre}</div>
                      </td>
                      <td>{eq.marca} · {eq.capacidad}</td>
                      <td><span className="badge badge-red">{eq.proximoMantenimiento}</span></td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => window.open(`https://wa.me/${cliente?.telefono}?text=Hola ${cliente?.nombre}, le contactamos por el mantenimiento del ${eq.tipo}.`, '_blank')}
                        >
                          💬 WhatsApp
                        </button>
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
