// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// COPIA AQUÍ TU URL (reemplaza esta con la tuya real)
const SUPABASE_URL = 'https://woudvudxvsvfxaxpfqiw.supabase.co'

// COPIA AQUÍ TU PUBLISHABLE KEY (la que ves en la imagen)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdWR2dWR4dnN2ZnhheHBmcWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDAyMTcsImV4cCI6MjA5MTkxNjIxN30.hp5_pTVqHqojsu3own9Y4_B8vTxbzZLxN6YIx4x9D44'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)


export async function addPlayer(player) {
    console.log('Intentando añadir jugador:', player)
    
    const { data, error } = await supabase
        .from('players')
        .insert([player])
        .select()
    
    if (error) {
        console.error('Error detallado:', error) // <-- Mira esto en consola
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}