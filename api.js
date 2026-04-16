// api.js - Todas las funciones de API para Supabase
import { supabase } from './supabase.js'

// ==================== JUGADORES ====================
export async function getPlayers() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('position', { ascending: true })
    
    if (error) {
        console.error('Error cargando jugadores:', error)
        return []
    }
    return data || []
}

export async function addPlayer(player) {
    const { data, error } = await supabase
        .from('players')
        .insert([player])
        .select()
    
    if (error) {
        console.error('Error añadiendo jugador:', error)
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}

export async function updatePlayer(id, updates) {
    const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', id)
        .select()
    
    if (error) {
        console.error('Error actualizando jugador:', error)
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}

export async function deletePlayer(id) {
    const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)
    
    if (error) {
        console.error('Error eliminando jugador:', error)
        alert('Error: ' + error.message)
        return false
    }
    return true
}

// ==================== PARTIDOS ====================
export async function getMatches() {
    const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error cargando partidos:', error)
        return []
    }
    return data || []
}

export async function addMatch(match) {
    const { data, error } = await supabase
        .from('matches')
        .insert([match])
        .select()
    
    if (error) {
        console.error('Error añadiendo partido:', error)
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}

export async function updateMatch(id, updates) {
    const { data, error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', id)
        .select()
    
    if (error) {
        console.error('Error actualizando partido:', error)
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}

export async function deleteMatch(id) {
    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id)
    
    if (error) {
        console.error('Error eliminando partido:', error)
        alert('Error: ' + error.message)
        return false
    }
    return true
}

// ==================== NOTICIAS ====================
export async function getNews() {
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error('Error cargando noticias:', error)
        return []
    }
    return data || []
}

export async function addNews(newsItem) {
    const { data, error } = await supabase
        .from('news')
        .insert([newsItem])
        .select()
    
    if (error) {
        console.error('Error añadiendo noticia:', error)
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}

export async function updateNews(id, updates) {
    const { data, error } = await supabase
        .from('news')
        .update(updates)
        .eq('id', id)
        .select()
    
    if (error) {
        console.error('Error actualizando noticia:', error)
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}

export async function deleteNews(id) {
    const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id)
    
    if (error) {
        console.error('Error eliminando noticia:', error)
        alert('Error: ' + error.message)
        return false
    }
    return true
}

// ==================== STATS DEL EQUIPO ====================
export async function getTeamStats() {
    const { data, error } = await supabase
        .from('team_stats')
        .select('*')
        .eq('id', 1)
        .single()
    
    if (error) {
        console.error('Error cargando stats:', error)
        return { player_count: 12, min_rank: 'Diamante 3' }
    }
    return data
}

export async function updateTeamStats(stats) {
    const { data, error } = await supabase
        .from('team_stats')
        .upsert({ id: 1, ...stats })
        .select()
    
    if (error) {
        console.error('Error actualizando stats:', error)
        alert('Error: ' + error.message)
        return null
    }
    return data[0]
}

// ==================== STORAGE (IMÁGENES) ====================
export async function uploadImage(file, folder) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
        .from('Images')
        .upload(fileName, file)
    
    if (uploadError) {
        console.error('Error subiendo imagen:', uploadError)
        alert('Error subiendo imagen: ' + uploadError.message)
        return null
    }
    
    const { data: { publicUrl } } = supabase.storage
        .from('Images')
        .getPublicUrl(fileName)
    
    return publicUrl
}

export async function uploadImageFromDataUrl(dataUrl, folder) {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })
    return await uploadImage(file, folder)
}

// ==================== AUTENTICACIÓN ====================
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    })
    
    if (error) {
        return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user }
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    
    if (error) {
        return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user, session: data.session }
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
        console.error('Error cerrando sesión:', error)
        return false
    }
    return true
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function isAdmin() {
    const user = await getCurrentUser()
    if (!user) return false
    
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    
    if (error || !data) return false
    return data.role === 'admin'
}
