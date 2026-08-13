// script.js — Excel Sect Premium v2
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

let editingPlayerId = null
let editingMatchId = null
let editingNewsId = null
let currentPlayerImage = null
let currentNewsImage = null
let matchGoals = []

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth()
    await loadAllData()
    renderAll()
    setupScrollReveal()
    setupEventListeners()
    setupNavScroll()
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
        if (e.target.closest('.upload-remove')) return
        document.getElementById('newsImageFile')?.click()
    })

    document.getElementById('playerImageFile')?.addEventListener('change', handlePlayerImageSelect)
    document.getElementById('playerImageUrl')?.addEventListener('blur', handlePlayerImageUrl)
    document.getElementById('playerImageUploadArea')?.addEventListener('click', (e) => {
        if (e.target.closest('.upload-remove')) return
        document.getElementById('playerImageFile')?.click()
    })

    // Close modals on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden')
            }
        })
    })
}

function setupNavScroll() {
    const nav = document.getElementById('mainNav')
    let ticking = false

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                if (window.scrollY > 50) {
                    nav.classList.add('scrolled')
                } else {
                    nav.classList.remove('scrolled')
                }
                ticking = false
            })
            ticking = true
        }
    })
}

function updateAdminUI() {
    const adminTrigger = document.getElementById('adminTrigger')
    const newsAdminBar = document.getElementById('newsAdminBar')

    if (isUserAdmin) {
        adminTrigger?.classList.remove('hidden')
        newsAdminBar?.classList.remove('hidden')
    } else {
        adminTrigger?.classList.add('hidden')
        newsAdminBar?.classList.add('hidden')
    }
}

// ==================== MOBILE MENU ====================
window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobileMenu')
    const btn = document.querySelector('.mobile-menu-btn')
    menu.classList.toggle('active')
    btn.classList.toggle('active')
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

window.updateTeamStatsFromAdmin = async function() {
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

window.editPlayerCount = function() {
    if (!isUserAdmin) return

    const currentEl = document.getElementById('statPlayerCount')
    const currentValue = teamStats.player_count

    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'stat-input'
    input.value = currentValue
    input.min = '0'
    input.max = '99'
    input.style.cssText = 'width:80px;background:var(--bg);border:1px solid var(--gold);border-radius:6px;padding:8px;color:var(--gold-bright);font-family:IBM Plex Mono;font-size:20px;font-weight:600;text-align:center;outline:none;'

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

window.editMinRank = function() {
    if (!isUserAdmin) return

    const currentEl = document.getElementById('statMinRank')
    const currentValue = teamStats.min_rank

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'stat-input'
    input.value = currentValue
    input.style.cssText = 'width:140px;background:var(--bg);border:1px solid var(--gold);border-radius:6px;padding:8px;color:var(--gold-bright);font-family:IBM Plex Mono;font-size:18px;font-weight:600;text-align:center;outline:none;'

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
                <i class="fas fa-user-group text-4xl text-yellow-400/60 mb-4"></i>
                <h3 class="text-xl font-bold text-yellow-400 mb-2">Top 3 vacío</h3>
                <p class="text-gray-400">El administrador aún no ha designado los mejores jugadores.</p>
            </div>
        `
        return
    }

    const topPlayers = players.slice(0, 3)

    const ranks = [
        { color: '#e6bf5c', label: '#1' },
        { color: '#c7c7cc', label: '#2' },
        { color: '#b08d57', label: '#3' }
    ]

    grid.innerHTML = topPlayers.map((player, index) => {
        const rank = ranks[index] || ranks[2]

        const adminActions = isUserAdmin ? `
            <div class="player-actions">
                <button onclick="event.stopPropagation(); window.editPlayer(${player.id})" title="Editar">
                    <i class="fas fa-pen"></i>
                </button>
                <button onclick="event.stopPropagation(); window.deletePlayerHandler(${player.id})" class="delete" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        ` : ''

        return `
            <div class="player-card reveal" style="--rank-color: ${rank.color};">
                <div class="player-rank">${rank.label}</div>
                ${adminActions}
                <div class="player-avatar-wrap">
                    <img src="${player.image_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + player.name}" 
                         alt="${player.name}" 
                         class="player-avatar"
                         onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}'">
                </div>
                <h3 class="player-name">${player.name}</h3>
                <p class="player-role">${player.role}</p>
                <div class="player-stats">
                    <div class="player-stat">
                        <span class="player-stat-label">Rango</span>
                        <span class="player-stat-value" style="color: ${rank.color}">${player.rank}</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-label">MMR</span>
                        <span class="player-stat-value">${player.mmr || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `
    }).join('')

    // Re-trigger reveal for new elements
    setupScrollReveal()
}

window.openAddPlayerModal = function() {
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
}

window.closeAddPlayerModal = function() {
    document.getElementById('addPlayerModal').classList.add('hidden')
    editingPlayerId = null
    currentPlayerImage = null
}

window.resetPlayerImageUpload = function() {
    const uploadArea = document.getElementById('playerImageUploadArea')
    const preview = document.getElementById('playerImagePreview')
    const fileInput = document.getElementById('playerImageFile')
    const urlInput = document.getElementById('playerImageUrl')
    const removeBtn = uploadArea?.querySelector('.upload-remove')
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
    const removeBtn = uploadArea?.querySelector('.upload-remove')
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

window.handleAddPlayer = async function(e) {
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

window.resetTop3 = async function() {
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
                <img src="Stadium.png" alt="No matches" class="w-32 h-auto mx-auto mb-6 opacity-60">
                <h3 class="text-xl font-bold text-yellow-400 mb-2">Sin partidos</h3>
                <p class="text-gray-400">No hay partidos programados actualmente.</p>
            </div>
        `
        return
    }

    container.innerHTML = matches.map(match => {
        const statusClass = match.status
        const statusText = {
            live: '<span class="match-status live"><span class="live-dot"></span> EN VIVO</span>',
            upcoming: '<span class="match-status upcoming">PRÓXIMO</span>',
            finished: '<span class="match-status finished">FINALIZADO</span>'
        }

        let goalsHtml = ''
        if (match.goals && match.goals.length > 0) {
            goalsHtml = `
                <div class="match-goals">
                    <div class="goals-title">Goles</div>
                    <div class="goals-list">
                        ${match.goals.map(g => `
                            <div class="goal-row ${g.team}">
                                <span class="goal-time">${g.time}'</span>
                                <span class="goal-scorer">${g.scorer}</span>
                                <span class="goal-team-name">${g.team === 'excel' ? 'Excel Sect' : match.opponent}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        }

        let mvpHtml = ''
        if (match.mvp_excel || match.mvp_opponent) {
            mvpHtml = `
                <div class="match-mvps">
                    ${match.mvp_excel ? `
                        <div class="mvp-tag excel">
                            <div class="mvp-label"><i class="fas fa-star"></i> MVP Excel Sect</div>
                            <div class="mvp-name">${match.mvp_excel}</div>
                        </div>
                    ` : ''}
                    ${match.mvp_opponent ? `
                        <div class="mvp-tag opponent">
                            <div class="mvp-label"><i class="fas fa-star"></i> MVP ${match.opponent}</div>
                            <div class="mvp-name">${match.mvp_opponent}</div>
                        </div>
                    ` : ''}
                </div>
            `
        }

        const adminActions = isUserAdmin ? `
            <div class="match-actions">
                <button onclick="event.stopPropagation(); window.editMatchHandler(${match.id})" title="Editar">
                    <i class="fas fa-pen"></i>
                </button>
                <button onclick="event.stopPropagation(); window.deleteMatchHandler(${match.id})" class="delete" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        ` : ''

        return `
            <div class="match-card ${statusClass} reveal">
                ${adminActions}
                <div class="match-teams">
                    <div class="match-team">
                        <div class="match-team-name">Excel Sect</div>
                        ${match.mvp_excel ? `<div class="match-team-mvp"><i class="fas fa-star text-xs"></i> ${match.mvp_excel}</div>` : ''}
                    </div>
                    <div class="match-score-box">
                        <div class="match-score">${match.score || '-'}</div>
                        <div class="match-tournament">${match.tournament}</div>
                    </div>
                    <div class="match-team">
                        <div class="match-team-name opponent">${match.opponent}</div>
                        ${match.mvp_opponent ? `<div class="match-team-mvp"><i class="fas fa-star text-xs"></i> ${match.mvp_opponent}</div>` : ''}
                    </div>
                </div>
                <div class="match-meta">
                    ${statusText[match.status]}
                    <div class="match-time">${match.match_time || ''}</div>
                </div>
                ${goalsHtml}
                ${mvpHtml}
            </div>
        `
    }).join('')

    setupScrollReveal()
}

window.openAddMatchModal = function() {
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
}

window.closeAddMatchModal = function() {
    document.getElementById('addMatchModal').classList.add('hidden')
    editingMatchId = null
    matchGoals = []
}

window.addGoalInput = function() {
    const container = document.getElementById('goalsContainer')
    const goalId = Date.now()

    const goalHtml = `
        <div class="goal-input-row" id="goal-${goalId}">
            <select class="goal-team-select">
                <option value="excel">Excel Sect</option>
                <option value="opponent">Rival</option>
            </select>
            <input type="text" class="goal-scorer" placeholder="Jugador">
            <input type="text" class="goal-time" placeholder="Min" style="width:70px;">
            <button type="button" onclick="window.removeGoalInput('${goalId}')"><i class="fas fa-xmark"></i></button>
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
    document.querySelectorAll('.goal-input-row').forEach(item => {
        const team = item.querySelector('.goal-team-select')?.value
        const scorer = item.querySelector('.goal-scorer')?.value?.trim()
        const time = item.querySelector('.goal-time')?.value?.trim()

        if (scorer && time) {
            goals.push({ team, scorer, time })
        }
    })
    return goals
}

window.handleAddMatch = async function(e) {
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
            const items = document.querySelectorAll('.goal-input-row')
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

window.resetMatches = async function() {
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
                <i class="fas fa-newspaper text-4xl text-yellow-400/60 mb-4"></i>
                <h3 class="text-xl font-bold text-yellow-400 mb-2">Sin noticias</h3>
                <p class="text-gray-400">No hay publicaciones recientes.</p>
            </div>
        `
        return
    }

    grid.innerHTML = news.map(item => {
        const imageHtml = item.image_url ? 
            `<div class="news-image-wrap">
                <img src="${item.image_url}" alt="${item.title}" class="news-image" loading="lazy">
            </div>` :
            `<div class="news-image-wrap news-image-placeholder">
                <i class="fas fa-newspaper"></i>
            </div>`

        const adminActions = isUserAdmin ? `
            <div class="news-actions">
                <button onclick="window.editNewsHandler(${item.id})" class="btn btn-sm">
                    <i class="fas fa-pen"></i> Editar
                </button>
                <button onclick="window.deleteNewsHandler(${item.id})" class="btn btn-sm" style="color:var(--danger);border-color:rgba(201,75,75,0.3);">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        ` : ''

        return `
            <article class="news-card reveal">
                ${imageHtml}
                <div class="news-body">
                    <div class="news-meta">
                        <span class="news-category">${item.category}</span>
                        <span class="news-date">
                            <i class="fas fa-calendar-day"></i> ${item.date || item.created_at?.split('T')[0] || 'Hoy'}
                        </span>
                    </div>
                    <h3 class="news-title">${item.title}</h3>
                    <p class="news-text">${item.content}</p>
                    ${adminActions}
                </div>
            </article>
        `
    }).join('')

    setupScrollReveal()
}

window.openAddNewsModal = function() {
    if (!isUserAdmin) return

    editingNewsId = null
    currentNewsImage = null

    document.getElementById('newsTitle').value = ''
    document.getElementById('newsContent').value = ''
    document.getElementById('newsCategory').value = 'General'
    resetNewsImageUpload()

    document.getElementById('addNewsModal').classList.remove('hidden')
    document.getElementById('newsTitle').focus()
}

window.closeAddNewsModal = function() {
    document.getElementById('addNewsModal').classList.add('hidden')
    editingNewsId = null
    currentNewsImage = null
}

window.resetNewsImageUpload = function() {
    const uploadArea = document.getElementById('imageUploadArea')
    const preview = document.getElementById('imagePreview')
    const fileInput = document.getElementById('newsImageFile')
    const urlInput = document.getElementById('newsImageUrl')
    const removeBtn = uploadArea?.querySelector('.upload-remove')
    const prompt = document.getElementById('uploadPrompt')

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
    const removeBtn = uploadArea?.querySelector('.upload-remove')
    const prompt = document.getElementById('uploadPrompt')

    if (preview) {
        preview.src = src
        preview.style.display = 'block'
    }
    if (uploadArea) uploadArea.classList.add('has-image')
    if (urlInput) urlInput.style.display = 'none'
    if (removeBtn) removeBtn.style.display = 'flex'
    if (prompt) prompt.style.display = 'none'
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

window.handleSaveNews = async function(e) {
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

window.resetNews = async function() {
    if (!confirm('¿Borrar TODAS las noticias?')) return

    for (const item of news) {
        await deleteNews(item.id)
    }

    news = []
    renderNews()
    renderAdminNews()
}

// ==================== ADMIN PANEL ====================
window.showAdminTab = function(tab) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'))
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'))

    document.getElementById(`admin-${tab}`).classList.remove('hidden')
    document.getElementById(`tab-${tab}`).classList.add('active')
}

function renderAdminPlayers() {
    const list = document.getElementById('adminPlayersList')
    if (!list) return

    if (players.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-dim">No hay jugadores en el Top 3</div>'
        updatePlayerLimitInfo()
        return
    }

    list.innerHTML = players.map((p, index) => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-rank">${index + 1}</div>
                <img src="${p.image_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + p.name}" class="admin-item-img">
                <div class="admin-item-text">
                    <div class="name">${p.name}</div>
                    <div class="meta">${p.role} · ${p.rank}</div>
                </div>
            </div>
            <div class="admin-item-actions">
                <button onclick="window.editPlayer(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="window.deletePlayerHandler(${p.id})" class="delete" title="Eliminar"><i class="fas fa-trash"></i></button>
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
        list.innerHTML = '<div class="text-center py-8 text-dim">No hay partidos</div>'
        return
    }

    list.innerHTML = matches.map(m => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-text">
                    <div class="name">vs ${m.opponent}</div>
                    <div class="meta">${m.tournament} · ${m.status}${m.goals?.length > 0 ? ' · ' + m.goals.length + ' goles' : ''}</div>
                </div>
            </div>
            <div class="admin-item-actions">
                <span class="admin-item-score">${m.score || '-'}</span>
                <button onclick="window.editMatchHandler(${m.id})" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="window.deleteMatchHandler(${m.id})" class="delete" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('')
}

function renderAdminNews() {
    const list = document.getElementById('adminNewsList')
    if (!list) return

    if (news.length === 0) {
        list.innerHTML = '<div class="text-center py-8 text-dim">No hay noticias</div>'
        return
    }

    list.innerHTML = news.map(n => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-text">
                    <div class="name">${n.title}</div>
                    <div class="meta">${n.category} · ${n.created_at?.split('T')[0] || 'Hoy'}</div>
                </div>
            </div>
            <div class="admin-item-actions">
                <button onclick="window.deleteNewsHandler(${n.id})" class="delete" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('')
}

// ==================== MODALES Y LOGIN ====================
window.openLoginModal = function() {
    document.getElementById('loginModal').classList.remove('hidden')
}

window.closeLoginModal = function() {
    document.getElementById('loginModal').classList.add('hidden')
}

window.openJoinModal = function() {
    document.getElementById('joinModal').classList.remove('hidden')
    document.getElementById('ticketDisplay').classList.add('hidden')
    document.getElementById('ticketForm').classList.remove('hidden')
    document.getElementById('ticketForm').reset()
}

window.closeJoinModal = function() {
    document.getElementById('joinModal').classList.add('hidden')
}

window.handleLogin = async function(e) {
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

window.logout = async function() {
    await signOut()
    currentUser = null
    isUserAdmin = false
    document.getElementById('adminPanel').classList.remove('active')
    updateAdminUI()
}

// ==================== TICKET SYSTEM ====================
window.generateTicket = function(e) {
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

window.copyTicket = function() {
    const content = document.getElementById('ticketContent').textContent
    navigator.clipboard.writeText(content).then(() => {
        const btn = document.querySelector('.ticket-header button')
        const original = btn.innerHTML
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado'
        btn.style.background = 'rgba(76, 175, 125, 0.2)'
        btn.style.borderColor = 'rgba(76, 175, 125, 0.4)'
        btn.style.color = '#4caf7d'
        setTimeout(() => {
            btn.innerHTML = original
            btn.style.background = ''
            btn.style.borderColor = ''
            btn.style.color = ''
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
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
}

window.toggleAccordion = function() {
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

// ==================== SMOOTH SCROLL ====================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault()
            const targetId = this.getAttribute('href')
            const targetElement = document.querySelector(targetId)
            if (targetElement) {
                const navHeight = document.querySelector('nav')?.offsetHeight || 72
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                })
            }
        })
    })
})

// ==================== SECRET ADMIN TRIGGER ====================
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
        console.log('🔓 Modo admin activado')
    } else {
        trigger.classList.add('hidden')
        console.log('🔒 Modo admin desactivado')
    }
}

window.toggleAdminTrigger = toggleAdminTrigger

// Expose all globals
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
window.toggleMobileMenu = toggleMobileMenu
