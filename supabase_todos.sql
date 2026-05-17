-- EJECUTAR ESTE CÓDIGO EN EL SQL EDITOR DE SUPABASE
-- Este script crea la tabla "todos" para gestionar tareas y recordatorios independientes del técnico.

CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'Media', -- 'Alta' | 'Media' | 'Baja'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Seguridad a Nivel de Fila (RLS)
-- Esto garantiza que cada técnico solo pueda ver y modificar sus propias tareas.
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Política de acceso para que los técnicos manejen sus propias tareas
CREATE POLICY "todos_own" ON todos
  FOR ALL USING (auth.uid() = user_id);
