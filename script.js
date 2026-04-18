// script.js - Conectado a Supabase API
import { 
    getPlayers, addPlayer, updatePlayer, deletePlayer,
    getMatches, addMatch, updateMatch, deleteMatch,
    getNews, addNews, updateNews, deleteNews,
    getTeamStats, updateTeamStats,
    uploadImage, uploadImageFromDataUrl,
    signIn, signOut, getCurrentUser, isAdmin,
    signInWithUsername  
} from './api.js'

// ==================== ESTADO GLOBAL ====================
let players = []
let matches = []
let news = []
let teamStats = { player_count: 12, min_rank: 'Diamante 3' }
let currentUser = null
let isUserAdmin = false

// Variables para edición
let editingPlayerId = null
let editingMatchId = null
let editingNewsId = null
let currentPlayerImage = null
let currentNewsImage = null
let matchGoals = []

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sesión
    await checkAuth()
    
    // Cargar todos los datos
    await loadAllData()
    
    // Renderizar todo
    renderAll()
    
    // Setup UI
    setupScrollReveal()
    setupEventListeners()
    updateAdminUI()
})

async function checkAuth() {
    const user = await getCurrentUser()
    if (user) {
        currentUser = user
        isUserAdmin = await isAdmin()
    }
}

async function loadAllData() {
    // Mostrar loading si quieres
    const [playersData, matchesData, newsData, statsData] = await Promise.all([
        getPlayers(),
        getMatches(),
        getNews(),
        getTeamStats()
    ])
    
    players = playersData
    matches = matchesData
    news = newsData
    teamStats = statsData || { player_count: 12, min_rank: 'Diamante 3' }
}

function renderAll() {
    renderPlayers()
    renderMatches()
    renderNews()
    renderTeamStats()
    renderAdminPlayers()
    renderAdminMatches()
    renderAdminNews()
}

function setupEventListeners() {
    // Image uploads
    document.getElementById('newsImageFile')?.addEventListener('change', handleNewsImageSelect)
    document.getElementById('newsImageUrl')?.addEventListener('blur', handleNewsImageUrl)
    document.getElementById('imageUploadArea')?.addEventListener('click', (e) => {
        if (e.target.closest('.remove-image-btn')) return
        document.getElementById('newsImageFile')?.click()
    })
    
    document.getElementById('playerImageFile')?.addEventListener('change', handlePlayerImageSelect)
    document.getElementById('playerImageUrl')?.addEventListener('blur', handlePlayerImageUrl)
    document.getElementById('playerImageUploadArea')?.addEventListener('click', (e) => {
        if (e.target.closest('.remove-image-btn')) return
        document.getElementById('playerImageFile')?.click()
    })
}

function updateAdminUI() {
    const adminTrigger = document.getElementById('adminTrigger')
    const newsAdminBar = document.getElementById('newsAdminBar')
    
    if (isUserAdmin) {
        adminTrigger?.classList.remove('hidden')
        newsAdminBar?.classList.remove('hidden')
        newsAdminBar.style.display = 'flex'
    } else {
        adminTrigger?.classList.add('hidden')
        newsAdminBar?.classList.add('hidden')
        newsAdminBar.style.display = 'none'
    }
}

// ==================== STATS EDITABLES ====================
function renderTeamStats() {
    const playerCountEl = document.getElementById('statPlayerCount')
    const minRankEl = document.getElementById('statMinRank')
    const adminPlayerCount = document.getElementById('adminPlayerCount')
    const adminMinRank = document.getElementById('adminMinRank')
    
    if (playerCountEl) playerCountEl.textContent = teamStats.player_count
    if (minRankEl) minRankEl.textContent = teamStats.min_rank
    if (adminPlayerCount) adminPlayerCount.value = teamStats.player_count
    if (adminMinRank) adminMinRank.value = teamStats.min_rank
}

async function updateTeamStatsFromAdmin() {
    if (!isUserAdmin) return
    
    const countInput = document.getElementById('adminPlayerCount')
    const rankInput = document.getElementById('adminMinRank')
    
    const updates = {
        player_count: parseInt(countInput?.value) || 12,
        min_rank: rankInput?.value || 'Diamante 3'
    }
    
    const saved = await updateTeamStats(updates)
    if (saved) {
        teamStats = saved
        renderTeamStats()
    }
}

function editPlayerCount() {
    if (!isUserAdmin) return
    
    const currentEl = document.getElementById('statPlayerCount')
    const currentValue = teamStats.player_count
    
    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'stat-input'
    input.value = currentValue
    input.min = '0'
    input.max = '99'
    
    currentEl.innerHTML = ''
    currentEl.appendChild(input)
    input.focus()
    input.select()
    
    const save = async () => {
        const newValue = parseInt(input.value) || 0
        const saved = await updateTeamStats({ player_count: newValue, min_rank: teamStats.min_rank })
        if (saved) {
            teamStats = saved
            renderTeamStats()
        }
    }
    
    input.addEventListener('blur', save)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur()
        if (e.key === 'Escape') currentEl.textContent = currentValue
    })
}

function editMinRank() {
    if (!isUserAdmin) return
    
    const currentEl = document.getElementById('statMinRank')
    const currentValue = teamStats.min_rank
    
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'stat-input'
    input.value = currentValue
    input.style.width = '140px'
    input.style.fontSize = '18px'
    
    currentEl.innerHTML = ''
    currentEl.appendChild(input)
    input.focus()
    input.select()
    
    const save = async () => {
        const newValue = input.value.trim() || 'Diamante 3'
        const saved = await updateTeamStats({ player_count: teamStats.player_count, min_rank: newValue })
        if (saved) {
            teamStats = saved
            renderTeamStats()
        }
    }
    
    input.addEventListener('blur', save)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur()
        if (e.key === 'Escape') currentEl.textContent = currentValue
    })
}

// ==================== JUGADORES (TOP 3) ====================
function renderPlayers() {
    const grid = document.getElementById('playersGrid')
    if (!grid) return
    
    if (players.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="text-6xl mb-4">👑</div>
                <h3 class="text-xl font-bold text-yellow-400 mb-2">Top 3 vacío</h3>
                <p class="text-gray-400">El administrador aún no ha designado los mejores jugadores.</p>
            </div>
        `
        return
    }
    
    const topPlayers = players.slice(0, 3)
    
    const ranks = [
        { color: '#FFD700', glow: '0 0 40px rgba(255, 215, 0, 0.5)', icon: '👑', label: '#1' },
        { color: '#C0C0C0', glow: '0 0 30px rgba(192, 192, 192, 0.4)', icon: '🥈', label: '#2' },
        { color: '#CD7F32', glow: '0 0 30px rgba(205, 127, 50, 0.4)', icon: '🥉', label: '#3' }
    ]
    
    grid.innerHTML = topPlayers.map((player, index) => {
        const rank = ranks[index] || ranks[2]
        
        const adminActions = isUserAdmin ? `
            <div class="player-admin-actions">
                <button onclick="event.stopPropagation(); window.editPlayer(${player.id})" class="player-btn edit" title="Editar">
                    ✏️
                </button>
                <button onclick="event.stopPropagation(); window.deletePlayerHandler(${player.id})" class="player-btn delete" title="Eliminar">
                    🗑️
                </button>
            </div>
        ` : ''
        
        return `
            <div class="top-player-card" style="--rank-color: ${rank.color}; --rank-glow: ${rank.glow};">
                <div class="rank-badge">${rank.icon} ${rank.label}</div>
                ${adminActions}
                <div class="player-avatar-container">
                    <div class="player-avatar-glow"></div>
                    <img src="${player.image_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name}" 
                         alt="${player.name}" 
                         class="player-avatar"
                         onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}'">
                </div>
                <h3 class="player-name">${player.name}</h3>
                <p class="player-role">${player.role}</p>
                <div class="player-stats">
                    <div class="stat">
                        <span class="stat-label">Rango</span>
                        <span class="stat-value" style="color: ${rank.color}">${player.rank}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">MMR</span>
                        <span class="stat-value">${player.mmr || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `
    }).join('')
}

function openAddPlayerModal() {
    if (players.length >= 3) {
        alert('Solo puede haber 3 jugadores en el Top. Elimina uno primero.')
        return
    }
    
    editingPlayerId = null
    currentPlayerImage = null
    
    document.getElementById('newPlayerName').value = ''
    document.getElementById('newPlayerRole').value = ''
    document.getElementById('newPlayerRank').value = ''
    document.getElementById('newPlayerStats').value = ''
    resetPlayerImageUpload()
    
    const modalTitle = document.querySelector('#addPlayerModal h3')
    if (modalTitle) modalTitle.textContent = 'Añadir al Top 3'
    
    document.getElementById('addPlayerModal').classList.remove('hidden')
    document.getElementById('addPlayerModal').classList.add('flex')
}

function closeAddPlayerModal() {
    document.getElementById('addPlayerModal').classList.add('hidden')
    document.getElementById('addPlayerModal').classList.remove('flex')
    editingPlayerId = null
    currentPlayerImage = null
}

function resetPlayerImageUpload() {
    const uploadArea = document.getElementById('playerImageUploadArea')
    const preview = document.getElementById('playerImagePreview')
    const fileInput = document.getElementById('playerImageFile')
    const urlInput = document.getElementById('playerImageUrl')
    const removeBtn = uploadArea?.querySelector('.remove-image-btn')
    const prompt = document.getElementById('playerUploadPrompt')
    
    if (uploadArea) uploadArea.classList.remove('has-image')
    if (preview) {
        preview.style.display = 'none'
        preview.src = ''
    }
    if (fileInput) fileInput.value = ''
    if (urlInput) {
        urlInput.value = ''
        urlInput.style.display = 'block'
    }
    if (removeBtn) removeBtn.style.display = 'none'
    if (prompt) prompt.style.display = 'block'
    currentPlayerImage = null
}

async function handlePlayerImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida')
        return
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB.')
        return
    }
    
    const imageUrl = await uploadImage(file, 'players')
    if (imageUrl) {
        showPlayerImagePreview(imageUrl)
        currentPlayerImage = imageUrl
    }
}

function showPlayerImagePreview(src) {
    currentPlayerImage = src
    const uploadArea = document.getElementById('playerImageUploadArea')
    const preview = document.getElementById('playerImagePreview')
    const urlInput = document.getElementById('playerImageUrl')
    const removeBtn = uploadArea?.querySelector('.remove-image-btn')
    const prompt = document.getElementById('playerUploadPrompt')
    
    if (preview) {
        preview.src = src
        preview.style.display = 'block'
    }
    if (uploadArea) uploadArea.classList.add('has-image')
    if (urlInput) urlInput.style.display = 'none'
    if (removeBtn) removeBtn.style.display = 'flex'
    if (prompt) prompt.style.display = 'none'
}

async function handlePlayerImageUrl(e) {
    const url = e.target.value.trim()
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        const img = new Image()
        img.onload = () => {
            showPlayerImagePreview(url)
            currentPlayerImage = url
        }
        img.onerror = () => {
            alert('No se pudo cargar la imagen. Verifica la URL.')
        }
        img.src = url
    }
}

async function handleAddPlayer(e) {
    e.preventDefault()
    
    const name = document.getElementById('newPlayerName').value.trim()
    const role = document.getElementById('newPlayerRole').value.trim()
    const rank = document.getElementById('newPlayerRank').value.trim()
    const mmr = document.getElementById('newPlayerStats').value.trim() || 'N/A'
    
    if (!name || !role || !rank) {
        alert('Nombre, rol y rango son obligatorios')
        return
    }
    
    const playerData = {
        name,
        role,
        rank,
        mmr,
        image_url: currentPlayerImage,
        position: editingPlayerId ? undefined : players.length + 1
    }
    
    let saved
    if (editingPlayerId) {
        saved = await updatePlayer(editingPlayerId, playerData)
    } else {
        saved = await addPlayer(playerData)
    }
    
    if (saved) {
        players = await getPlayers()
        renderPlayers()
        renderAdminPlayers()
        closeAddPlayerModal()
        e.target.reset()
    }
}

window.editPlayer = async function(id) {
    const player = players.find(p => p.id === id)
    if (!player) return
    
    editingPlayerId = id
    currentPlayerImage = player.image_url
    
    document.getElementById('newPlayerName').value = player.name
    document.getElementById('newPlayerRole').value = player.role
    document.getElementById('newPlayerRank').value = player.rank
    document.getElementById('newPlayerStats').value = player.mmr || ''
    
    if (player.image_url) {
        showPlayerImagePreview(player.image_url)
    } else {
        resetPlayerImageUpload()
    }
    
    const modalTitle = document.querySelector('#addPlayerModal h3')
    if (modalTitle) modalTitle.textContent = 'Editar Jugador'
    
    document.getElementById('addPlayerModal').classList.remove('hidden')
    document.getElementById('addPlayerModal').classList.add('flex')
}

window.deletePlayerHandler = async function(id) {
    if (!confirm('¿Eliminar este jugador?')) return
    
    const success = await deletePlayer(id)
    if (success) {
        players = await getPlayers()
        renderPlayers()
        renderAdminPlayers()
    }
}

async function resetTop3() {
    if (!confirm('¿Eliminar TODO el Top 3?')) return
    
    for (const player of players) {
        await deletePlayer(player.id)
    }
    
    players = []
    renderPlayers()
    renderAdminPlayers()
}

// ==================== PARTIDOS ====================
function renderMatches() {
    const container = document.getElementById('matchesContainer')
    if (!container) return
    
    if (matches.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">🏟️</div>
                <h3 class="text-xl font-bold text-yellow-400 mb-2">Sin partidos</h3>
                <p class="text-gray-400">No hay partidos programados actualmente.</p>
            </div>
        `
        return
    }
    
    container.innerHTML = matches.map(match => {
        const statusColors = {
            live: 'border-red-500/50 bg-red-500/10',
            upcoming: 'border-yellow-500/50 bg-yellow-500/10',
            finished: 'border-gray-500/50 bg-gray-500/10'
        }
        const statusText = {
            live: '<span class="text-red-400 font-bold flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full live-indicator"></span>EN VIVO</span>',
            upcoming: '<span class="text-yellow-400 font-bold">PRÓXIMO</span>',
            finished: '<span class="text-gray-400 font-bold">FINALIZADO</span>'
        }
        
        let goalsHtml = ''
        if (match.goals && match.goals.length > 0) {
            goalsHtml = `
                <div class="match-goals mt-4 pt-4 border-t border-white/10">
                    <div class="text-xs text-gray-400 mb-2 uppercase tracking-wider">Goles</div>
                    <div class="goals-list">
                        ${match.goals.map(g => `
                            <div class="goal-item ${g.team === 'excel' ? 'goal-excel' : 'goal-opponent'}">
                                <span class="goal-time">${g.time}'</span>
                                <span class="goal-scorer">${g.scorer}</span>
                                <span class="goal-team">${g.team === 'excel' ? 'Excel Sect' : match.opponent}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        }
        
        let mvpHtml = ''
        if (match.mvp_excel || match.mvp_opponent) {
            mvpHtml = `
                <div class="match-mvps mt-4 flex gap-4">
                    ${match.mvp_excel ? `
                        <div class="mvp-badge mvp-excel">
                            <span class="mvp-label">⭐ MVP Excel Sect</span>
                            <span class="mvp-name">${match.mvp_excel}</span>
                        </div>
                    ` : ''}
                    ${match.mvp_opponent ? `
                        <div class="mvp-badge mvp-opponent">
                            <span class="mvp-label">⭐ MVP ${match.opponent}</span>
                            <span class="mvp-name">${match.mvp_opponent}</span>
                        </div>
                    ` : ''}
                </div>
            `
        }
        
        const adminActions = isUserAdmin ? `
            <div class="match-admin-actions absolute top-4 right-4 flex gap-2">
                <button onclick="event.stopPropagation(); window.editMatchHandler(${match.id})" class="match-btn edit" title="Editar">
                    ✏️
                </button>
                <button onclick="event.stopPropagation(); window.deleteMatchHandler(${match.id})" class="match-btn delete" title="Eliminar">
                    🗑️
                </button>
            </div>
        ` : ''
        
        return `
            <div class="match-card glass rounded-xl p-6 border ${statusColors[match.status]} relative hover:scale-[1.02] transition duration-300">
                ${adminActions}
                <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="team-excel text-center">
                            <div class="text-2xl font-bold text-white">Excel Sect</div>
                            <div class="text-sm text-yellow-400">${match.mvp_excel ? '⭐ ' + match.mvp_excel : ''}</div>
                        </div>
                        <div class="score-display text-center px-6">
                            <div class="text-4xl font-bold text-yellow-400">${match.score || '-'}</div>
                            <div class="text-xs text-gray-500 uppercase mt-1">${match.tournament}</div>
                        </div>
                        <div class="team-opponent text-center">
                            <div class="text-2xl font-bold text-gray-300">${match.opponent}</div>
                            <div class="text-sm text-gray-400">${match.mvp_opponent ? '⭐ ' + match.mvp_opponent : ''}</div>
                        </div>
                    </div>
                    <div class="text-center md:text-right">
                        ${statusText[match.status]}
                        <div class="text-sm text-gray-400 mt-1">${match.match_time || ''}</div>
                    </div>
                </div>
                ${goalsHtml}
                ${mvpHtml}
            </div>
        `
    }).join('')
}

function openAddMatchModal() {
    editingMatchId = null
    matchGoals = []
    
    document.getElementById('matchOpponent').value = ''
    document.getElementById('matchTournament').value = ''
    document.getElementById('matchStatus').value = 'upcoming'
    document.getElementById('matchScore').value = ''
    document.getElementById('matchTime').value = ''
    document.getElementById('matchMvpExcel').value = ''
    document.getElementById('matchMvpOpponent').value = ''
    document.getElementById('goalsContainer').innerHTML = ''
    
    const modalTitle = document.querySelector('#addMatchModal h3')
    if (modalTitle) modalTitle.textContent = 'Añadir Partido'
    
    document.getElementById('addMatchModal').classList.remove('hidden')
    document.getElementById('addMatchModal').classList.add('flex')
}

function closeAddMatchModal() {
    document.getElementById('addMatchModal').classList.add('hidden')
    document.getElementById('addMatchModal').classList.remove('flex')
    editingMatchId = null
    matchGoals = []
}

function addGoalInput() {
    const container = document.getElementById('goalsContainer')
    const goalId = Date.now()
    
    const goalHtml = `
        <div class="goal-input-item" id="goal-${goalId}">
            <select class="goal-team-select bg-black/50 border border-gray-700 rounded px-3 py-2 text-white text-sm">
                <option value="excel">Excel Sect</option>
                <option value="opponent">Rival</option>
            </select>
            <input type="text" class="goal-scorer bg-black/50 border border-gray-700 rounded px-3 py-2 text-white text-sm" placeholder="Jugador">
            <input type="text" class="goal-time bg-black/50 border border-gray-700 rounded px-3 py-2 text-white text-sm w-20" placeholder="Min">
            <button type="button" onclick="window.removeGoalInput('${goalId}')" class="text-red-400 hover:text-red-300">❌</button>
        </div>
    `
    
    container.insertAdjacentHTML('beforeend', goalHtml)
    matchGoals.push(goalId)
}

window.removeGoalInput = function(goalId) {
    const el = document.getElementById(`goal-${goalId}`)
    if (el) el.remove()
    matchGoals = matchGoals.filter(id => id !== parseInt(goalId))
}

function collectGoals() {
    const goals = []
    document.querySelectorAll('.goal-input-item').forEach(item => {
        const team = item.querySelector('.goal-team-select')?.value
        const scorer = item.querySelector('.goal-scorer')?.value?.trim()
        const time = item.querySelector('.goal-time')?.value?.trim()
        
        if (scorer && time) {
            goals.push({ team, scorer, time })
        }
    })
    return goals
}

async function handleAddMatch(e) {
    e.preventDefault()
    
    const opponent = document.getElementById('matchOpponent').value.trim()
    const tournament = document.getElementById('matchTournament').value.trim()
    const status = document.getElementById('matchStatus').value
    const score = document.getElementById('matchScore').value.trim() || '-'
    const time = document.getElementById('matchTime').value.trim()
    const mvpExcel = document.getElementById('matchMvpExcel').value.trim()
    const mvpOpponent = document.getElementById('matchMvpOpponent').value.trim()
    const goals = collectGoals()
    
    if (!opponent || !tournament) {
        alert('Oponente y torneo son obligatorios')
        return
    }
    
    const matchData = {
        opponent,
        tournament,
        status,
        score,
        match_time: time,
        mvp_excel: mvpExcel || null,
        mvp_opponent: mvpOpponent || null,
        goals: goals
    }
    
    let saved
    if (editingMatchId) {
        saved = await updateMatch(editingMatchId, matchData)
    } else {
        saved = await addMatch(matchData)
    }
    
    if (saved) {
        matches = await getMatches()
        renderMatches()
        renderAdminMatches()
        closeAddMatchModal()
        e.target.reset()
    }
}

window.editMatchHandler = async function(id) {
    const match = matches.find(m => m.id === id)
    if (!match) return
    
    editingMatchId = id
    
    document.getElementById('matchOpponent').value = match.opponent
    document.getElementById('matchTournament').value = match.tournament
    document.getElementById('matchStatus').value = match.status
    document.getElementById('matchScore').value = match.score || ''
    document.getElementById('matchTime').value = match.match_time || ''
    document.getElementById('matchMvpExcel').value = match.mvp_excel || ''
    document.getElementById('matchMvpOpponent').value = match.mvp_opponent || ''
    
    const container = document.getElementById('goalsContainer')
    container.innerHTML = ''
    matchGoals = []
    
    if (match.goals && match.goals.length > 0) {
        match.goals.forEach(g => {
            addGoalInput()
            const items = document.querySelectorAll('.goal-input-item')
            const lastItem = items[items.length - 1]
            if (lastItem) {
                lastItem.querySelector('.goal-team-select').value = g.team
                lastItem.querySelector('.goal-scorer').value = g.scorer
                lastItem.querySelector('.goal-time').value = g.time
            }
        })
    }
    
    const modalTitle = document.querySelector('#addMatchModal h3')
    if (modalTitle) modalTitle.textContent = 'Editar Partido'
    
    document.getElementById('addMatchModal').classList.remove('hidden')
    document.getElementById('addMatchModal').classList.add('flex')
}

window.deleteMatchHandler = async function(id) {
    if (!confirm('¿Eliminar este partido?')) return
    
    const success = await deleteMatch(id)
    if (success) {
        matches = await getMatches()
        renderMatches()
        renderAdminMatches()
    }
}

async function resetMatches() {
    if (!confirm('¿Eliminar TODOS los partidos?')) return
    
    for (const match of matches) {
        await deleteMatch(match.id)
    }
    
    matches = []
    renderMatches()
    renderAdminMatches()
}

// ==================== NOTICIAS ====================
function renderNews() {
    const grid = document.getElementById('newsGrid')
    if (!grid) return
    
    if (news.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="text-6xl mb-4">📰</div>
                <h3 class="text-xl font-bold text-yellow-400 mb-2">Sin noticias</h3>
                <p class="text-gray-400">No hay publicaciones recientes.</p>
            </div>
        `
        return
    }

    const categoryColors = {
        'Torneo': 'from-yellow-400 to-orange-500',
        'Fichaje': 'from-yellow-300 to-yellow-500',
        'Entrenamiento': 'from-yellow-500 to-amber-600',
        'General': 'from-amber-400 to-yellow-600',
        'Victoria': 'from-green-400 to-emerald-500',
        'Derrota': 'from-red-400 to-rose-500'
    }

    grid.innerHTML = news.map(item => {
        const imageHtml = item.image_url ? 
            `<div class="news-image-container">
                <img src="${item.image_url}" alt="${item.title}" class="news-image" loading="lazy">
            </div>` :
            `<div class="news-image-container news-image-placeholder">
                📰
            </div>`

        const adminActions = isUserAdmin ? `
            <div class="news-actions">
                <button onclick="window.editNewsHandler(${item.id})" class="btn" style="font-size:12px; padding:8px 14px;">
                    ✏️ Editar
                </button>
                <button onclick="window.deleteNewsHandler(${item.id})" class="btn" style="font-size:12px; padding:8px 14px; color:var(--danger);">
                    🗑️ Eliminar
                </button>
            </div>
        ` : ''

        return `
            <article class="news-card reveal">
                ${imageHtml}
                <div class="news-content">
                    <span class="news-category" style="background: linear-gradient(135deg, ${categoryColors[item.category] || 'from-yellow-400 to-yellow-600'}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; border: 1px solid rgba(250,204,21,0.3);">
                        ${item.category}
                    </span>
                    <div class="news-date">
                        📅 ${item.date || item.created_at?.split('T')[0] || 'Hoy'}
                    </div>
                    <h3 class="news-title">${item.title}</h3>
                    <p class="news-text">${item.content}</p>
                    ${adminActions}
                </div>
            </article>
        `
    }).join('')
}

function openAddNewsModal() {
    if (!isUserAdmin) return
    
    editingNewsId = null
    currentNewsImage = null
    
    document.getElementById('newsTitle').value = ''
    document.getElementById('newsContent').value = ''
    document.getElementById('newsCategory').value = 'General'
    resetNewsImageUpload()
    
    document.getElementById('addNewsModal').classList.remove('hidden')
    document.getElementById('addNewsModal').classList.add('flex')
    document.getElementById('newsTitle').focus()
}

function closeAddNewsModal() {
    document.getElementById('addNewsModal').classList.add('hidden')
    document.getElementById('addNewsModal').classList.remove('flex')
    editingNewsId = null
    currentNewsImage = null
}

function resetNewsImageUpload() {
    const uploadArea = document.getElementById('imageUploadArea')
    const preview = document.getElementById('imagePreview')
    const fileInput = document.getElementById('newsImageFile')
    const urlInput = document.getElementById('newsImageUrl')
    const removeBtn = uploadArea?.querySelector('.remove-image-btn')
    
    if (uploadArea) uploadArea.classList.remove('has-image')
    if (preview) {
        preview.style.display = 'none'
        preview.src = ''
    }
    if (fileInput) fileInput.value = ''
    if (urlInput) {
        urlInput.value = ''
        urlInput.style.display = 'block'
    }
    if (removeBtn) removeBtn.style.display = 'none'
    currentNewsImage = null
}

async function handleNewsImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida')
        return
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB.')
        return
    }
    
    const imageUrl = await uploadImage(file, 'news')
    if (imageUrl) {
        showNewsImagePreview(imageUrl)
        currentNewsImage = imageUrl
    }
}

function showNewsImagePreview(src) {
    currentNewsImage = src
    const uploadArea = document.getElementById('imageUploadArea')
    const preview = document.getElementById('imagePreview')
    const urlInput = document.getElementById('newsImageUrl')
    const removeBtn = uploadArea?.querySelector('.remove-image-btn')
    
    if (preview) {
        preview.src = src
        preview.style.display = 'block'
    }
    if (uploadArea) uploadArea.classList.add('has-image')
    if (urlInput) urlInput.style.display = 'none'
    if (removeBtn) removeBtn.style.display = 'flex'
}

async function handleNewsImageUrl(e) {
    const url = e.target.value.trim()
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        const img = new Image()
        img.onload = () => {
            showNewsImagePreview(url)
            currentNewsImage = url
        }
        img.onerror = () => {
            alert('No se pudo cargar la imagen. Verifica la URL.')
        }
        img.src = url
    }
}

async function handleSaveNews(e) {
    e.preventDefault()
    
    const title = document.getElementById('newsTitle').value.trim()
    const content = document.getElementById('newsContent').value.trim()
    const category = document.getElementById('newsCategory').value
    
    if (!title || !content) {
        alert('Título y contenido son obligatorios')
        return
    }
    
    const newsItem = {
        title,
        content,
        category,
        image_url: currentNewsImage
    }
    
    let saved
    if (editingNewsId) {
        saved = await updateNews(editingNewsId, newsItem)
    } else {
        saved = await addNews(newsItem)
    }
    
    if (saved) {
        news = await getNews()
        renderNews()
        renderAdminNews()
        closeAddNewsModal()
    }
}

window.editNewsHandler = async function(id) {
    const item = news.find(n => n.id === id)
    if (!item) return
    
    editingNewsId = id
    document.getElementById('newsTitle').value = item.title
    document.getElementById('newsContent').value = item.content
    document.getElementById('newsCategory').value = item.category
    
    if (item.image_url) {
        showNewsImagePreview(item.image_url)
        currentNewsImage = item.image_url
    } else {
        resetNewsImageUpload()
    }
    
    openAddNewsModal()
}

window.deleteNewsHandler = async function(id) {
    if (!confirm('¿Eliminar esta noticia?')) return
    
    const success = await deleteNews(id)
    if (success) {
        news = await getNews()
        renderNews()
        renderAdminNews()
    }
}

async function resetNews() {
    if (!confirm('¿Borrar TODAS las noticias?')) return
    
    for (const item of news) {
        await deleteNews(item.id)
    }
    
    news = []
    renderNews()
    renderAdminNews()
}

// ==================== ADMIN PANEL ====================
function showAdminTab(tab) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'))
    document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.remove('text-yellow-400', 'border-b-2', 'border-yellow-400', 'font-semibold')
        t.classList.add('text-gray-400')
    })
    
    document.getElementById(`admin-${tab}`).classList.remove('hidden')
    document.getElementById(`tab-${tab}`).classList.remove('text-gray-400')
    document.getElementById(`tab-${tab}`).classList.add('text-yellow-400', 'border-b-2', 'border-yellow-400', 'font-semibold')
}

function renderAdminPlayers() {
    const list = document.getElementById('adminPlayersList')
    if (!list) return
    
    if (players.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-center py-8">No hay jugadores en el Top 3</div>'
        updatePlayerLimitInfo()
        return
    }
    
    list.innerHTML = players.map((p, index) => `
        <div class="glass p-4 rounded-lg flex justify-between items-center border border-gray-800 hover:border-yellow-500/30 transition">
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold">
                    ${index + 1}
                </div>
                <img src="${p.image_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.name}" class="w-10 h-10 rounded-full">
                <div>
                    <div class="font-bold">${p.name}</div>
                    <div class="text-sm text-gray-400">${p.role} • ${p.rank}</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.editPlayer(${p.id})" class="text-yellow-400 hover:text-yellow-300 transition p-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="window.deletePlayerHandler(${p.id})" class="text-red-400 hover:text-red-300 transition p-2">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')
    
    updatePlayerLimitInfo()
}

function updatePlayerLimitInfo() {
    const info = document.getElementById('playerLimitInfo')
    const count = document.getElementById('currentPlayerCount')
    if (info && count) {
        count.textContent = players.length
        if (players.length >= 3) {
            info.classList.add('full')
            info.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Top 3 completo. Elimina uno para añadir otro.</span>'
        } else {
            info.classList.remove('full')
            info.innerHTML = `<i class="fas fa-info-circle"></i><span>Hay <strong>${players.length}</strong>/3 jugadores en el Top 3</span>`
        }
    }
}

function renderAdminMatches() {
    const list = document.getElementById('adminMatchesList')
    if (!list) return
    
    if (matches.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-center py-8">No hay partidos</div>'
        return
    }
    
    list.innerHTML = matches.map(m => `
        <div class="glass p-4 rounded-lg flex justify-between items-center border border-gray-800 hover:border-yellow-500/30 transition">
            <div>
                <div class="font-bold">vs ${m.opponent}</div>
                <div class="text-sm text-gray-400">${m.tournament} • ${m.status} ${m.goals?.length > 0 ? '• ' + m.goals.length + ' goles' : ''}</div>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-yellow-400 font-bold">${m.score || '-'}</span>
                <button onclick="window.editMatchHandler(${m.id})" class="text-yellow-400 hover:text-yellow-300 transition p-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="window.deleteMatchHandler(${m.id})" class="text-red-400 hover:text-red-300 transition p-2">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')
}

function renderAdminNews() {
    const list = document.getElementById('adminNewsList')
    if (!list) return
    
    if (news.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-center py-8">No hay noticias</div>'
        return
    }
    
    list.innerHTML = news.map(n => `
        <div class="glass p-4 rounded-lg flex justify-between items-center border border-gray-800 hover:border-yellow-500/30 transition">
            <div>
                <div class="font-bold">${n.title}</div>
                <div class="text-sm text-gray-400">${n.category} • ${n.created_at?.split('T')[0] || 'Hoy'}</div>
            </div>
            <button onclick="window.deleteNewsHandler(${n.id})" class="text-red-400 hover:text-red-300 transition p-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('')
}

// ==================== MODALES Y LOGIN ====================
function openLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden')
    document.getElementById('loginModal').classList.add('flex')
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden')
    document.getElementById('loginModal').classList.remove('flex')
}

function openJoinModal() {
    document.getElementById('joinModal').classList.remove('hidden')
    document.getElementById('joinModal').classList.add('flex')
    document.getElementById('ticketDisplay').classList.add('hidden')
    document.getElementById('ticketForm').classList.remove('hidden')
    document.getElementById('ticketForm').reset()
}

function closeJoinModal() {
    document.getElementById('joinModal').classList.add('hidden')
    document.getElementById('joinModal').classList.remove('flex')
}

async function handleLogin(e) {
    e.preventDefault()
    
    const username = document.getElementById('loginUser').value
    const password = document.getElementById('loginPass').value
    
    const result = await signInWithUsername(username, password)
    
    if (result.success) {
        currentUser = result.user
        isUserAdmin = true
        closeLoginModal()
        showAdminPanel()
        updateAdminUI()
    } else {
        alert(result.error)
    }
}
function showAdminPanel() {
    document.getElementById('adminPanel').classList.add('active')
    renderAdminPlayers()
    renderAdminMatches()
    renderAdminNews()
    window.scrollTo(0, 0)
}

async function logout() {
    await signOut()
    currentUser = null
    isUserAdmin = false
    document.getElementById('adminPanel').classList.remove('active')
    updateAdminUI()
}

// ==================== TICKET SYSTEM ====================
function generateTicket(e) {
    e.preventDefault()
    const name = document.getElementById('rlName').value
    const rank = document.getElementById('rank').value
    const discord = document.getElementById('discordId').value
    const exp = document.getElementById('experience').value
    const hours = document.getElementById('hours').value
    
    const ticket = `🎫 **SOLICITUD DE INGRESO - EXCEL SECT**
    
👤 **Nombre RL:** ${name}
🏆 **Rango:** ${rank}
💬 **Discord:** ${discord}
⏰ **Horas disponibles:** ${hours}/día
📋 **Experiencia:** ${exp || 'No especificada'}

---
Solicitud generada: ${new Date().toLocaleString()}`
    
    document.getElementById('ticketContent').textContent = ticket
    document.getElementById('ticketDisplay').classList.remove('hidden')
    document.getElementById('ticketForm').classList.add('hidden')
}

function copyTicket() {
    const content = document.getElementById('ticketContent').textContent
    navigator.clipboard.writeText(content).then(() => {
        const btn = document.querySelector('#ticketDisplay button')
        const original = btn.innerHTML
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado'
        btn.classList.add('copy-success')
        setTimeout(() => {
            btn.innerHTML = original
            btn.classList.remove('copy-success')
        }, 2000)
    })
}

// ==================== UI UTILITIES ====================
function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active')
            }
        })
    }, { threshold: 0.1 })

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
}

function toggleAccordion() {
    const header = document.getElementById('accHeader')
    const body = document.getElementById('accBody')
    const isOpen = body.classList.contains('open')
    
    if (isOpen) {
        body.classList.remove('open')
        header.classList.remove('active')
        header.setAttribute('aria-expanded', 'false')
    } else {
        body.classList.add('open')
        header.classList.add('active')
        header.setAttribute('aria-expanded', 'true')
        
        setTimeout(() => {
            const accordion = document.getElementById('rulesAccordion')
            const rect = accordion.getBoundingClientRect()
            if (rect.top < 100) {
                accordion.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }, 100)
    }
}

// Exponer funciones globales necesarias
window.openLoginModal = openLoginModal
window.closeLoginModal = closeLoginModal
window.openJoinModal = openJoinModal
window.closeJoinModal = closeJoinModal
window.handleLogin = handleLogin
window.logout = logout
window.showAdminTab = showAdminTab
window.openAddPlayerModal = openAddPlayerModal
window.closeAddPlayerModal = closeAddPlayerModal
window.handleAddPlayer = handleAddPlayer
window.resetTop3 = resetTop3
window.openAddMatchModal = openAddMatchModal
window.closeAddMatchModal = closeAddMatchModal
window.addGoalInput = addGoalInput
window.handleAddMatch = handleAddMatch
window.resetMatches = resetMatches
window.openAddNewsModal = openAddNewsModal
window.closeAddNewsModal = closeAddNewsModal
window.handleSaveNews = handleSaveNews
window.resetNews = resetNews
window.generateTicket = generateTicket
window.copyTicket = copyTicket
window.toggleAccordion = toggleAccordion
window.editPlayerCount = editPlayerCount
window.editMinRank = editMinRank
window.updateTeamStatsFromAdmin = updateTeamStatsFromAdmin
window.resetPlayerImageUpload = resetPlayerImageUpload
window.resetNewsImageUpload = resetNewsImageUpload

window.onclick = function(event) {
    if (event.target.classList.contains('fixed')) {
        event.target.classList.add('hidden')
        event.target.classList.remove('flex')
    }
}
let keySequence = []
const SECRET_CODE = ['Control', 'i', 'c', 'q', 'b']
    document.addEventListener('keydown', (e) => {
     if (e.repeat) return
    
    const key = e.key
    keySequence.push(key)
    

    if (keySequence.length > 5) {
        keySequence.shift()
    }
    

    if (keySequence.join(',') === SECRET_CODE.join(',')) {
        e.preventDefault()
        toggleAdminTrigger()
        keySequence = [] 
    }
})

function toggleAdminTrigger() {
    const trigger = document.getElementById('adminTrigger')
    
    if (trigger.classList.contains('hidden')) {
        trigger.classList.remove('hidden')
        trigger.classList.add('flex')
        console.log('🔓 Modo admin activado')
    } else {
        trigger.classList.add('hidden')
        trigger.classList.remove('flex')
        console.log('🔒 Modo admin desactivado')
    }
}


window.toggleAdminTrigger = toggleAdminTrigger
