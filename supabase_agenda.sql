-- EJECUTAR ESTE CÓDIGO EN EL SQL EDITOR DE SUPABASE
-- Este script crea la tabla independiente "agenda" para gestionar visitas programadas,
-- asociándolas a los equipos con control de estado, fecha, hora y notas.

CREATE TABLE IF NOT EXISTS agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TEXT, -- Formato de hora (ej: "10:00 AM" o "14:30")
  estado TEXT DEFAULT 'pendiente', -- 'pendiente' | 'realizado' | 'cancelado'
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;

-- Política de acceso para que los técnicos manejen su propia agenda
CREATE POLICY "agenda_own" ON agenda
  FOR ALL USING (auth.uid() = user_id);
