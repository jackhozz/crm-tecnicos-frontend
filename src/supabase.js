import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const realSupabase = createClient(supabaseUrl, supabaseAnonKey)

// Transparent mock storage wrapper for local development and offline demoing
const mockStorage = {
  get(table) {
    try {
      return JSON.parse(localStorage.getItem(`mock_${table}`) || '[]')
    } catch {
      return []
    }
  },
  set(table, data) {
    localStorage.setItem(`mock_${table}`, JSON.stringify(data))
  }
}

// Pre-seed premium mockup data if empty
if (!localStorage.getItem('mock_clientes')) {
  mockStorage.set('clientes', [
    { id: 'c1', nombre: 'Clínica Metropolitana', telefono: '+584121111111', correo: 'contacto@clinicametro.com' },
    { id: 'c2', nombre: 'Supermercados Plaza', telefono: '+584142222222', correo: 'mantenimiento@plazas.com' }
  ])
}
if (!localStorage.getItem('mock_equipos')) {
  mockStorage.set('equipos', [
    { id: 'e1', cliente_id: 'c1', nombre: 'Aire Central Quirófano', tipo: 'Chiller', marca: 'Carrier', modelo: '30RB', serial: 'CH-88291', intervalo_mantenimiento: '3', intervalo_unidad: 'meses', ultimo_mantenimiento: '2026-02-15', proximo_mantenimiento: '2026-05-15' },
    { id: 'e2', cliente_id: 'c2', nombre: 'Cava Cuarto Carnes', tipo: 'Cava Cuarto', marca: 'Copeland', modelo: 'CS-10', serial: 'CV-99120', intervalo_mantenimiento: '6', intervalo_unidad: 'meses', ultimo_mantenimiento: '2025-11-20', proximo_mantenimiento: '2026-05-20' }
  ])
}
if (!localStorage.getItem('mock_agenda')) {
  mockStorage.set('agenda', [
    { id: 'a1', equipo_id: 'e1', fecha: new Date().toISOString().split('T')[0], hora: '09:00', notas: 'Revisión periódica y carga de refrigerante', estado: 'pendiente' },
    { id: 'a2', equipo_id: 'e2', fecha: '2026-05-20', hora: '14:30', notas: 'Limpieza de evaporador y condensador', estado: 'pendiente' }
  ])
}

export const supabase = new Proxy(realSupabase, {
  get(target, prop) {
    if (prop === 'auth') {
      return new Proxy(target.auth, {
        get(authTarget, authProp) {
          if (authProp === 'getSession') {
            return async () => {
              if (localStorage.getItem('mock_user')) {
                const user = JSON.parse(localStorage.getItem('mock_user'))
                return { data: { session: { user } }, error: null }
              }
              return authTarget.getSession()
            }
          }
          if (authProp === 'onAuthStateChange') {
            return (callback) => {
              const unsub = authTarget.onAuthStateChange(callback)
              if (localStorage.getItem('mock_user')) {
                const user = JSON.parse(localStorage.getItem('mock_user'))
                setTimeout(() => callback('SIGNED_IN', { user }), 0)
              }
              return unsub
            }
          }
          if (authProp === 'signInWithPassword') {
            return async ({ email, password }) => {
              if (email.trim() === 'admin@mantenizapp.com' && password === 'admin123') {
                const user = { id: '00000000-0000-0000-0000-000000000000', email: email.trim() }
                localStorage.setItem('mock_user', JSON.stringify(user))
                return { data: { user, session: {} }, error: null }
              }
              return authTarget.signInWithPassword({ email, password })
            }
          }
          if (authProp === 'signOut') {
            return async () => {
              localStorage.removeItem('mock_user')
              return authTarget.signOut()
            }
          }
          
          const val = authTarget[authProp]
          if (typeof val === 'function') {
            return val.bind(authTarget)
          }
          return val
        }
      })
    }

    if (prop === 'from') {
      return (table) => {
        if (!localStorage.getItem('mock_user')) {
          return target.from(table)
        }

        return {
          select(queryStr = '*') {
            const list = mockStorage.get(table)
            return {
              eq(field, val) {
                let filtered = list
                if (field === 'id') filtered = list.filter(item => item.id === val)
                else if (field === 'user_id') filtered = list
                else if (field === 'cliente_id') filtered = list.filter(item => item.cliente_id === val)
                else if (field === 'estado') filtered = list.filter(item => item.estado === val)
                
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: filtered[0] || null, error: null })
                  },
                  order() {
                    return Promise.resolve({ data: filtered, error: null })
                  },
                  then(cb) {
                    return Promise.resolve({ data: filtered, error: null }).then(cb)
                  }
                }
              },
              not() {
                return {
                  order() {
                    return Promise.resolve({ data: list, error: null })
                  },
                  then(cb) {
                    return Promise.resolve({ data: list, error: null }).then(cb)
                  }
                }
              },
              order() {
                let data = list
                if (table === 'agenda') {
                  const equipos = mockStorage.get('equipos')
                  const clientes = mockStorage.get('clientes')
                  data = list.map(ag => {
                    const eq = equipos.find(e => e.id === ag.equipo_id)
                    const cl = eq ? clientes.find(c => c.id === eq.cliente_id) : null
                    return {
                      ...ag,
                      equipos: eq ? { ...eq, clientes: cl } : null
                    }
                  })
                } else if (table === 'informes') {
                  const clientes = mockStorage.get('clientes')
                  data = list.map(inf => ({
                    ...inf,
                    clientes: clientes.find(c => c.id === inf.cliente_id) || null
                  }))
                }
                return Promise.resolve({ data, error: null })
              },
              maybeSingle() {
                return Promise.resolve({ data: list[0] || null, error: null })
              },
              then(cb) {
                return Promise.resolve({ data: list, error: null }).then(cb)
              }
            }
          },
          async insert(payload) {
            const list = mockStorage.get(table)
            const items = Array.isArray(payload) ? payload : [payload]
            const created = items.map(item => ({
              id: Math.random().toString(36).substring(2, 9),
              created_at: new Date().toISOString(),
              ...item
            }))
            mockStorage.set(table, [...list, ...created])
            return { data: created, error: null }
          },
          async upsert(payload) {
            const list = mockStorage.get(table)
            const items = Array.isArray(payload) ? payload : [payload]
            let updatedList = [...list]
            items.forEach(item => {
              const uid = item.id || Math.random().toString(36).substring(2, 9)
              const idx = updatedList.findIndex(x => x.id === uid)
              if (idx !== -1) {
                updatedList[idx] = { ...updatedList[idx], ...item }
              } else {
                updatedList.push({ id: uid, ...item })
              }
            })
            mockStorage.set(table, updatedList)
            return { data: items, error: null }
          },
          async update(payload) {
            return {
              eq(field, val) {
                const list = mockStorage.get(table)
                const updatedList = list.map(item => {
                  if (item[field] === val) {
                    return { ...item, ...payload }
                  }
                  return item
                })
                mockStorage.set(table, updatedList)
                return Promise.resolve({ data: null, error: null })
              }
            }
          }
        }
      }
    }

    return target[prop]
  }
})