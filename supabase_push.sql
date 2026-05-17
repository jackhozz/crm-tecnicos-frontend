-- EJECUTAR ESTE CÓDIGO EN EL SQL EDITOR DE SUPABASE
-- Este script crea la tabla de suscripciones Push para recibir notificaciones de fondo directamente desde Supabase.

-- 1. Crear tabla para almacenar las suscripciones de los navegadores de tus dispositivos
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_sub UNIQUE (user_id, subscription)
);

-- Habilitar Seguridad (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política de RLS para que cada técnico controle únicamente sus suscripciones
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 2. Función disparadora en Supabase para enviar notificaciones de fondo directamente
-- Esta función hace un llamado HTTP a una Edge Function que usa el protocolo Web Push estándar.
CREATE OR REPLACE FUNCTION notificar_tarea_urgente_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo enviar push si la tarea es de prioridad Alta y no está completada
  IF NEW.priority = 'Alta' AND NEW.completed = FALSE THEN
    PERFORM net.http_post(
      url := 'https://igmqvuikeldupchxqxap.supabase.co/functions/v1/enviar-webpush-directo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::jsonb->>'authorization'
      ),
      body := json_build_object(
        'user_id', NEW.user_id,
        'title', '📌 Tarea Pendiente Urgente',
        'body', NEW.text,
        'url', '/dashboard'
      )::text::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger asociado a la inserción o actualización de la tabla todos
CREATE OR REPLACE TRIGGER tr_push_directo_tarea
AFTER INSERT OR UPDATE OF priority, completed ON todos
FOR EACH ROW
EXECUTE FUNCTION notificar_tarea_urgente_push();
