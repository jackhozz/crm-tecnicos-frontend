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

-- Eliminar política previa si existe para evitar errores de ejecución repetida
DROP POLICY IF EXISTS "push_subscriptions_own" ON push_subscriptions;

-- Política de RLS para que cada técnico controle únicamente sus suscripciones
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 2. Función disparadora en Supabase para enviar notificaciones de fondo directamente
-- Esta función hace un llamado HTTP a una Edge Function que usa el protocolo Web Push estándar.
CREATE OR REPLACE FUNCTION notificar_tarea_urgente_push()
RETURNS TRIGGER AS $$
DECLARE
  req_headers text;
  auth_header text;
BEGIN
  -- Solo enviar push si la tarea es de prioridad Alta y no está completada
  IF NEW.priority = 'Alta' AND NEW.completed = FALSE THEN
    -- Envolver todo en un bloque EXCEPTION para que NUNCA cancele la inserción de la tarea
    BEGIN
      -- Intentar obtener la cabecera de autorización de forma segura
      BEGIN
        req_headers := current_setting('request.headers', true);
        IF req_headers IS NOT NULL AND req_headers <> '' THEN
          auth_header := req_headers::jsonb->>'authorization';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        auth_header := NULL;
      END;

      -- Si no viene cabecera en el contexto actual, usar la anon key del sistema por defecto
      IF auth_header IS NULL THEN
        auth_header := 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbXF2dWlrZWxkdXBjaHhxeGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTM3MzIsImV4cCI6MjA5NDQ4OTczMn0.Zjipc8m8FK8VpuRIfaMBmbzYbNYItdnKE6iDQWsYY8Y';
      END IF;

      -- Intentar el POST. Si la extensión pg_net (esquema 'net') no está activa, no detendrá la app
      PERFORM net.http_post(
        url := 'https://igmqvuikeldupchxqxap.supabase.co/functions/v1/enviar-webpush-directo',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', auth_header
        ),
        body := json_build_object(
          'user_id', NEW.user_id,
          'title', '📌 Tarea Pendiente Urgente',
          'body', NEW.text,
          'url', '/dashboard'
        )::text::jsonb
      );
    EXCEPTION WHEN OTHERS THEN
      -- Capturar cualquier excepción (incluyendo que el esquema 'net' no existe)
      -- y reportarlo como un warning sutil en los logs de Supabase sin romper la transacción
      RAISE WARNING 'No se pudo enviar la notificación push de la tarea: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger asociado a la inserción o actualización de la tabla todos
CREATE OR REPLACE TRIGGER tr_push_directo_tarea
AFTER INSERT OR UPDATE OF priority, completed ON todos
FOR EACH ROW
EXECUTE FUNCTION notificar_tarea_urgente_push();
