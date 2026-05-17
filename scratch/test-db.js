import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseAnonKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumn() {
  // Try to update/insert with fecha_agenda
  const { error } = await supabase
    .from('equipos')
    .insert({
      nombre: 'Test Check Column',
      fecha_agenda: '2026-05-17'
    });
  
  if (error && error.message.includes('fecha_agenda')) {
    console.log('RESULT: COLUMN_DOES_NOT_EXIST');
  } else if (error) {
    console.log('RESULT: OTHER_ERROR (but column probably exists):', error.message);
  } else {
    console.log('RESULT: COLUMN_EXISTS_AND_INSERTED_OK');
  }
}
checkColumn();
