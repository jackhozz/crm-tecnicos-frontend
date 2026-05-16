import React, { useState } from 'react';

// --- MOCK DATA (Simulación de la Base de Datos) ---
const mockClientes = [
  { id: 1, nombre: 'Juan Pérez', telefono: '584121234567', direccion: 'Av. Las Delicias, Maracay' },
  { id: 2, nombre: 'Empresa Frío C.A.', telefono: '584149876543', direccion: 'Zona Industrial, Valencia' },
];

const mockEquipos = [
  { id: 101, clienteId: 1, tipo: 'Aire Acondicionado Split', marca: 'Samsung', capacidad: '12000 BTU', ultimoMantenimiento: '2026-02-10', proximoMantenimiento: '2026-05-10' },
  { id: 102, clienteId: 2, tipo: 'Cava Cuarto', marca: 'Carrier', capacidad: '5 Toneladas', ultimoMantenimiento: '2026-04-15', proximoMantenimiento: '2026-05-15' },
  { id: 103, clienteId: 2, tipo: 'Exhibidor', marca: 'Boreal', capacidad: '2 Puertas', ultimoMantenimiento: '2025-11-01', proximoMantenimiento: '2026-02-01' },
];

// --- COMPONENTES ---

const Navbar = ({ setVistaActual }) => (
  <nav className="bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
    <div className="font-bold text-xl cursor-pointer" onClick={() => setVistaActual('dashboard')}>
      ❄️ TermoControl Hub
    </div>
    <div className="flex space-x-4">
      <button onClick={() => setVistaActual('dashboard')} className="hover:text-blue-300 transition">Dashboard</button>
      <button onClick={() => setVistaActual('clientes')} className="hover:text-blue-300 transition">Mis Clientes</button>
      <button onClick={() => setVistaActual('presupuestos')} className="hover:text-blue-300 transition">Presupuestos / IA</button>
    </div>
  </nav>
);

const Dashboard = () => {
  const hoy = new Date('2026-05-16');

  const mantenimientosAtrasados = mockEquipos.filter(eq => new Date(eq.proximoMantenimiento) < hoy);
  const mantenimientosEstaSemana = mockEquipos.filter(eq => {
    const fechaMantenimiento = new Date(eq.proximoMantenimiento);
    const diferenciaDias = (fechaMantenimiento - hoy) / (1000 * 60 * 60 * 24);
    return diferenciaDias >= 0 && diferenciaDias <= 7;
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Panel de Control</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-gray-500 text-sm font-bold uppercase">Total Clientes</h2>
          <p className="text-3xl font-bold text-gray-800">{mockClientes.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <h2 className="text-gray-500 text-sm font-bold uppercase">Mantenimientos Esta Semana</h2>
          <p className="text-3xl font-bold text-gray-800">{mantenimientosEstaSemana.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <h2 className="text-gray-500 text-sm font-bold uppercase">Alertas: Atrasados</h2>
          <p className="text-3xl font-bold text-red-600">{mantenimientosAtrasados.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Equipos que requieren atención urgente</h2>
        {mantenimientosAtrasados.length === 0 ? (
          <p className="text-green-600">¡Todo al día! No hay mantenimientos atrasados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-sm">
                  <th className="p-3">Equipo</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Fecha Programada</th>
                  <th className="p-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientosAtrasados.map(eq => {
                  const cliente = mockClientes.find(c => c.id === eq.clienteId);
                  return (
                    <tr key={eq.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{eq.tipo} - {cliente.nombre}</td>
                      <td className="p-3">{eq.marca} ({eq.capacidad})</td>
                      <td className="p-3 text-red-500 font-bold">{eq.proximoMantenimiento}</td>
                      <td className="p-3">
                        <button
                          onClick={() => window.open(`https://wa.me/${cliente.telefono}?text=Hola ${cliente.nombre}, le escribo porque el equipo ${eq.tipo} requiere mantenimiento según nuestro registro.`, '_blank')}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
                        >
                          Contactar WhatsApp
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
  );
};

const ClientesView = () => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Directorio de Clientes</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
          + Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockClientes.map(cliente => {
          const equiposDelCliente = mockEquipos.filter(eq => eq.clienteId === cliente.id);
          return (
            <div key={cliente.id} className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">{cliente.nombre}</h2>
                <p className="text-gray-600 text-sm mb-1">📍 {cliente.direccion}</p>
                <p className="text-gray-600 text-sm mb-4">⚙️ {equiposDelCliente.length} Equipos registrados</p>
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => window.open(`https://wa.me/${cliente.telefono}`, '_blank')}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded text-center hover:bg-green-600 transition"
                >
                  WhatsApp
                </button>
                <button className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded text-center hover:bg-gray-300 transition">
                  Ver Detalles
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

const PresupuestosIA = () => (
  <div className="p-6 text-center">
    <h1 className="text-3xl font-bold text-gray-800 mb-4">Informes de Obra con IA</h1>
    <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <p className="text-gray-600 mb-6">Describe lo que hiciste de forma breve y la IA redactará un informe técnico profesional para tu cliente.</p>
      <textarea
        className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        rows="4"
        placeholder="Ej: Cambié el capacitor del compresor, limpié serpentines y recargué 1kg de gas R410A."
      ></textarea>
      <button className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow hover:bg-purple-700 w-full font-bold text-lg transition">
        ✨ Generar Informe Profesional
      </button>
    </div>
  </div>
);

// --- APP PRINCIPAL ---
export default function App() {
  const [vistaActual, setVistaActual] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar setVistaActual={setVistaActual} />

      <main className="max-w-7xl mx-auto">
        {vistaActual === 'dashboard' && <Dashboard />}
        {vistaActual === 'clientes' && <ClientesView />}
        {vistaActual === 'presupuestos' && <PresupuestosIA />}
      </main>
    </div>
  );
}