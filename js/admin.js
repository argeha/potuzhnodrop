(() => {
  'use strict'

  const state = { me: null, members: [], roles: [], assignableRoles: [], audit: [], gameCapabilities: {}, player: null, catalog: [], selectedSkinId: '' }
  let inviteCode = new URLSearchParams(window.location.search).get('invite') || ''
  const $ = selector => document.querySelector(selector)
  const headerStatus = $('#headerStatus')
  const accessNotice = $('#accessNotice')
  const teamList = $('#teamList')
  const auditList = $('#auditList')
  const roleSelect = $('#memberRole')
  const memberForm = $('#memberForm')
  const submitButton = $('#memberSubmit')
  const refreshButton = $('#refreshButton')
  const toastRegion = $('#toastRegion')
  const adminMain = $('#adminMain')
  const loginGate = $('#loginGate')
  const inviteGate = $('#inviteGate')
  const logoutButton = $('#logoutButton')
  const gamePanel = $('#gamePanel')
  const gameUnavailable = $('#gameUnavailable')
  const playerWorkspace = $('#playerWorkspace')
  const playerSummary = $('#playerSummary')
  const gameControls = $('#gameControls')
  const skinSearchResults = $('#skinSearchResults')
  const playerInventory = $('#playerInventory')
  let skinSearchTimer = null

  const actionLabels = {
    access_granted: 'створив(ла) доступ',
    role_updated: 'оновив(ла) роль',
    access_suspended: 'призупинив(ла) доступ',
    access_activated: 'відновив(ла) доступ',
    access_revoked: 'прибрав(ла) доступ',
    invite_accepted: 'активував(ла) запрошення',
    game_pc_add: 'додав(ла) PC',
    game_pc_set: 'встановив(ла) PC',
    game_xp_add: 'додав(ла) XP',
    game_xp_set: 'встановив(ла) XP',
    game_tickets_add: 'додав(ла) квитки',
    game_tickets_set: 'встановив(ла) квитки',
    game_pass_xp_add: 'додав(ла) XP Battle Pass',
    game_pass_xp_set: 'встановив(ла) XP Battle Pass',
    game_premium_enable: 'активував(ла) Battle Pass',
    game_premium_disable: 'вимкнув(ла) Battle Pass',
    game_prestige_set: 'встановив(ла) престиж',
    game_skin_grant: 'видав(ла) скін',
    game_skin_remove: 'прибрав(ла) скін',
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]))

  function showToast(message, type = 'success') {
    const toast = document.createElement('div')
    toast.className = `toast${type === 'error' ? ' error' : ''}`
    toast.textContent = message
    toastRegion.append(toast)
    window.setTimeout(() => toast.remove(), 4400)
  }

  function setHeader(text, status = 'loading') {
    headerStatus.classList.toggle('is-ready', status === 'ready')
    headerStatus.classList.toggle('is-error', status === 'error')
    headerStatus.querySelector('span:last-child').textContent = text
  }

  function setNotice(message = '') {
    accessNotice.textContent = message
    accessNotice.classList.toggle('hidden', !message)
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      ...options,
    })
    let data = null
    try { data = await response.json() } catch {}
    if (!response.ok) {
      const error = new Error(data?.error || `Помилка сервера (${response.status}).`)
      error.status = response.status
      throw error
    }
    return data || {}
  }

  function roleName(role) {
    return role?.label || '—'
  }

  function formatTime(value) {
    const date = new Date(Number(value) || 0)
    if (!Number.isFinite(date.getTime()) || date.getTime() < 1) return '—'
    return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'short', timeStyle: 'short' }).format(date)
  }

  function showGate() {
    adminMain.classList.add('hidden')
    logoutButton.classList.add('hidden')
    if (inviteCode) {
      loginGate.classList.add('hidden')
      inviteGate.classList.remove('hidden')
      setHeader('Запрошення очікує', 'loading')
    } else {
      inviteGate.classList.add('hidden')
      loginGate.classList.remove('hidden')
      setHeader('Потрібен вхід', 'loading')
    }
  }

  function showPanel() {
    loginGate.classList.add('hidden')
    inviteGate.classList.add('hidden')
    adminMain.classList.remove('hidden')
    logoutButton.classList.remove('hidden')
  }

  function renderIdentity() {
    const me = state.me
    $('#myRole').textContent = roleName(me?.role)
    $('#myEmail').textContent = me?.role?.id === 'owner' ? 'Сесія власника' : (me?.email || 'Запрошений доступ')
    $('#myRoleDescription').textContent = me?.role?.description || 'Панель очікує підтвердження особи.'
  }

  function renderRoleSelect() {
    const allowed = state.roles.filter(role => state.assignableRoles.includes(role.id))
    roleSelect.replaceChildren()
    if (!allowed.length) {
      roleSelect.add(new Option('Твоя роль не видає доступи', ''))
      roleSelect.disabled = true
      submitButton.disabled = true
      return
    }
    allowed.forEach(role => roleSelect.add(new Option(role.label, role.id)))
    roleSelect.disabled = false
    submitButton.disabled = false
  }

  function renderRoles() {
    $('#rolesOverview').innerHTML = state.roles.map(role => `
      <article class="role-card${state.assignableRoles.includes(role.id) ? ' is-assignable' : ''}">
        <div class="role-title"><span>${escapeHtml(role.label)}</span><span class="role-rank">РІВЕНЬ ${escapeHtml(role.rank)}</span></div>
        <p>${escapeHtml(role.description)}</p>
      </article>`).join('')
  }

  function rowActions(member) {
    if (member.protected) return '<span class="protected-note"><i class="fa-solid fa-lock"></i> Захищено</span>'
    if (member.isCurrent) return '<span class="current-note"><i class="fa-solid fa-circle-user"></i> Це ти</span>'
    if (!member.canManage) return '<span class="current-note">Без прав</span>'
    const suspend = member.status === 'suspended'
      ? '<button class="small-button" data-member-action="activate">Відновити</button>'
      : '<button class="small-button" data-member-action="suspend">Призупинити</button>'
    return `<div class="row-actions">${suspend}<button class="small-button danger" data-member-action="revoke">Прибрати</button></div>`
  }

  function renderTeam() {
    const count = state.members.length
    $('#teamCount').textContent = `${count} ${count === 1 ? 'учасник' : count < 5 ? 'учасники' : 'учасників'}`
    if (!count) {
      teamList.innerHTML = '<p class="empty-line">Команда ще не має доступів.</p>'
      return
    }
    teamList.innerHTML = state.members.map(member => `
      <article class="team-row" data-email="${escapeHtml(member.email)}">
        <div><strong class="member-name">${escapeHtml(member.name || (member.protected ? 'Власник' : 'Без імені'))}</strong><span class="member-email">${escapeHtml(member.email || 'Головний доступ')}</span></div>
        <span class="role-badge${member.role.id === 'owner' ? ' owner' : ''}">${escapeHtml(roleName(member.role))}</span>
        <span class="status-badge${member.status === 'suspended' ? ' suspended' : ''}">${member.status === 'suspended' ? 'Призупинено' : 'Активний'}</span>
        ${rowActions(member)}
      </article>`).join('')
  }

  function renderAudit() {
    if (!state.audit.length) {
      auditList.innerHTML = '<p class="empty-line">Поки що немає дій у журналі.</p>'
      return
    }
    auditList.innerHTML = state.audit.map(entry => `
      <article class="audit-row">
        <span class="audit-marker"></span>
        <div><strong>${escapeHtml(entry.actor)} ${escapeHtml(actionLabels[entry.action] || entry.action)}</strong><p>${entry.target ? `Для: ${escapeHtml(entry.target)}` : ''}${entry.detail ? `${entry.target ? ' · ' : ''}${escapeHtml(entry.detail)}` : ''}</p></div>
        <time datetime="${new Date(Number(entry.at) || 0).toISOString()}">${escapeHtml(formatTime(entry.at))}</time>
      </article>`).join('')
  }

  const canGame = capability => state.gameCapabilities?.[capability] === true

  function setOptions(element, options, selected = '') {
    if (!element) return
    element.replaceChildren()
    options.forEach(option => element.add(new Option(option.label, option.value, false, option.value === selected)))
  }

  function renderGamePermissions() {
    const canRead = canGame('read')
    gamePanel.classList.toggle('hidden', !state.me)
    gameUnavailable.classList.toggle('hidden', canRead)
    if (!canRead) {
      playerWorkspace.classList.add('hidden')
      return
    }
    const economyOptions = [{ value: 'pc_add', label: 'Додати PC' }]
    const progressOptions = [{ value: 'xp_add', label: 'Додати XP' }, { value: 'tickets_add', label: 'Додати квитки' }]
    const passOptions = [{ value: 'pass_xp_add', label: 'Додати XP' }]
    if (canGame('configure')) {
      economyOptions.push({ value: 'pc_set', label: 'Встановити PC' })
      progressOptions.push({ value: 'xp_set', label: 'Встановити XP' }, { value: 'tickets_set', label: 'Встановити квитки' })
      passOptions.push({ value: 'pass_xp_set', label: 'Встановити XP' })
    }
    setOptions($('#economyOperation'), economyOptions)
    setOptions($('#progressOperation'), progressOptions)
    setOptions($('#passOperation'), passOptions)
    $('#premiumDisableButton').classList.toggle('hidden', !canGame('configure'))
    $('#prestigeForm').classList.toggle('hidden', !canGame('configure'))
    $('#skinManagerTitle').closest('.skin-manager').classList.toggle('is-readonly', !canGame('grant'))
    $('#skinSearch').disabled = !canGame('grant')
    $('#grantSkinButton').disabled = !canGame('grant') || !state.selectedSkinId
  }

  const integer = value => Math.max(0, Math.round(Number(value) || 0))
  const compact = value => new Intl.NumberFormat('uk-UA').format(integer(value))
  const skinImage = source => source ? `/api/skin-image?src=${encodeURIComponent(source)}` : ''

  function renderPlayer() {
    const player = state.player
    playerWorkspace.classList.toggle('hidden', !player)
    if (!player) return
    playerSummary.innerHTML = `
      <div class="player-heading"><div><p class="eyebrow">АКТИВНИЙ ПРОФІЛЬ</p><h3>${escapeHtml(player.name)}</h3><code>${escapeHtml(player.accountId)}</code></div><span class="profile-revision">версія ${escapeHtml(player.revision)}</span></div>
      <div class="player-stats">
        <div><span>БАЛАНС</span><strong>${compact(player.balance)} PC</strong></div>
        <div><span>РІВЕНЬ</span><strong>${compact(player.level)} <small>${compact(player.xp)} XP</small></strong></div>
        <div><span>ПРЕСТИЖ</span><strong>P${compact(player.prestige)}</strong></div>
        <div><span>КВИТКИ</span><strong>${compact(player.caseTickets)}</strong></div>
        <div><span>BATTLE PASS</span><strong>${compact(player.battlePass?.xp)} XP <small>${player.battlePass?.premium ? 'активний' : 'неактивний'}</small></strong></div>
      </div>`
    $('#inventoryCount').textContent = `${compact(player.inventoryTotal)} скінів`
    $('#premiumEnableButton').classList.toggle('hidden', player.battlePass?.premium === true)
    $('#premiumDisableButton').classList.toggle('hidden', !canGame('configure') || player.battlePass?.premium !== true)
    const items = Array.isArray(player.inventory) ? player.inventory : []
    playerInventory.innerHTML = items.length
      ? items.map(item => `<article class="admin-skin" data-item-id="${escapeHtml(item.id)}"><img src="${escapeHtml(skinImage(item.img))}" alt="" loading="lazy"><div><strong>${escapeHtml(item.name)}</strong><span style="color:${escapeHtml(item.rarityColor || '#b0c3d9')}">${escapeHtml(item.rarity)} · ${compact(item.price)} PC</span></div>${canGame('inventory') ? '<button class="small-button danger" type="button" data-remove-skin title="Прибрати скін"><i class="fa-solid fa-trash"></i></button>' : ''}</article>`).join('')
      : '<p class="empty-line">У профілі поки що немає скінів.</p>'
  }

  function renderCatalog() {
    const selected = state.selectedSkinId
    const items = state.catalog || []
    if (!items.length) {
      skinSearchResults.innerHTML = '<p class="empty-line">Нічого не знайдено.</p>'
      return
    }
    skinSearchResults.innerHTML = items.map(item => `<button type="button" class="catalog-skin${item.id === selected ? ' is-selected' : ''}" data-skin-id="${escapeHtml(item.id)}"><img src="${escapeHtml(skinImage(item.img))}" alt="" loading="lazy"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.weapon)} · ${compact(item.price)} PC</small></span><i class="fa-solid ${item.id === selected ? 'fa-circle-check' : 'fa-circle'}"></i></button>`).join('')
  }

  function renderGame() {
    renderGamePermissions()
    renderPlayer()
    renderCatalog()
  }

  function renderAll() {
    renderIdentity()
    renderRoleSelect()
    renderRoles()
    renderTeam()
    renderAudit()
    renderGame()
  }

  function renderInvite(invite) {
    if (!invite?.url) return
    $('#inviteUrl').value = invite.url
    $('#inviteExpiry').textContent = `Дійсне до ${formatTime(invite.expiresAt)} · після активації стане недійсним.`
    $('#inviteResult').classList.remove('hidden')
  }

  async function load({ quiet = false } = {}) {
    setNotice('')
    refreshButton.disabled = true
    setHeader('Оновлення…')
    try {
      const [me, team, audit] = await Promise.all([api('/api/admin/me'), api('/api/admin/team'), api('/api/admin/audit')])
      state.me = me.me
      state.roles = team.roles || me.roles || []
      state.members = team.members || []
      state.assignableRoles = team.assignableRoles || me.assignableRoles || []
      state.audit = audit.audit || []
      state.gameCapabilities = me.gameCapabilities || {}
      renderAll()
      showPanel()
      setHeader('Захищена сесія', 'ready')
    } catch (error) {
      state.roles = []
      state.assignableRoles = []
      state.gameCapabilities = {}
      showGate()
      if (error.status !== 401 && !quiet) showToast(error.message, 'error')
    } finally {
      refreshButton.disabled = false
    }
  }

  async function mutateMember(payload, successMessage) {
    submitButton.disabled = true
    try {
      const data = await api('/api/admin/members', { method: 'POST', body: JSON.stringify(payload) })
      state.members = data.members || state.members
      state.audit = data.audit || state.audit
      state.assignableRoles = data.assignableRoles || state.assignableRoles
      renderAll()
      renderInvite(data.invite)
      showToast(successMessage)
      return true
    } catch (error) {
      if (error.status === 401) showGate()
      showToast(error.message, 'error')
      return false
    } finally {
      submitButton.disabled = !state.assignableRoles.length
    }
  }

  $('#ownerLoginForm').addEventListener('submit', async event => {
    event.preventDefault()
    const button = $('#ownerLoginButton')
    const password = $('#ownerPassword').value
    if (!password) return
    button.disabled = true
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      $('#ownerPassword').value = ''
      await load({ quiet: true })
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      button.disabled = false
    }
  })

  $('#activateInviteButton').addEventListener('click', async () => {
    const button = $('#activateInviteButton')
    button.disabled = true
    try {
      await api('/api/admin/activate-invite', { method: 'POST', body: JSON.stringify({ invite: inviteCode }) })
      window.history.replaceState({}, document.title, '/admin')
      inviteCode = ''
      await load({ quiet: true })
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      button.disabled = false
    }
  })

  memberForm.addEventListener('submit', async event => {
    event.preventDefault()
    const email = $('#memberEmail').value.trim()
    const role = roleSelect.value
    const name = $('#memberName').value.trim()
    if (!email || !role) return
    const saved = await mutateMember({ action: 'grant', email, role, name }, 'Запрошення створено. Скопіюй посилання та передай його людині.')
    if (saved) {
      memberForm.reset()
      renderRoleSelect()
    }
  })

  teamList.addEventListener('click', async event => {
    const button = event.target.closest('[data-member-action]')
    if (!button) return
    const row = button.closest('[data-email]')
    const email = row?.dataset.email
    const action = button.dataset.memberAction
    if (!email || !action) return
    const label = action === 'revoke' ? 'прибрати доступ' : action === 'suspend' ? 'призупинити доступ' : 'відновити доступ'
    if (!window.confirm(`Точно ${label} для ${email}?`)) return
    await mutateMember({ action, email }, `Дію виконано: ${label}.`)
  })

  async function refreshAuditAfterGameAction() {
    try {
      const data = await api('/api/admin/audit')
      state.audit = data.audit || state.audit
    } catch {}
  }

  async function mutateGame(operation, extra = {}, { confirmText = '' } = {}) {
    if (!state.player?.accountId) return showToast('Спочатку відкрий Cloud Profile ID.', 'error')
    if (confirmText && !window.confirm(confirmText)) return
    const buttons = [...gameControls.querySelectorAll('button'), $('#grantSkinButton')]
    buttons.forEach(button => { if (button) button.disabled = true })
    try {
      const data = await api('/api/admin/game/mutate', {
        method: 'POST',
        body: JSON.stringify({ accountId: state.player.accountId, operation, ...extra })
      })
      state.player = data.player || state.player
      await refreshAuditAfterGameAction()
      renderAll()
      showToast(data.detail || 'Профіль оновлено на сервері.')
    } catch (error) {
      if (error.status === 401) showGate()
      showToast(error.message, 'error')
    } finally {
      buttons.forEach(button => { if (button) button.disabled = false })
      renderGamePermissions()
    }
  }

  $('#profileLookupForm').addEventListener('submit', async event => {
    event.preventDefault()
    const accountId = $('#profileAccountId').value.trim()
    if (!accountId) return
    const button = $('#profileLookupButton')
    button.disabled = true
    try {
      const data = await api(`/api/admin/game/player?accountId=${encodeURIComponent(accountId)}`)
      state.player = data.player || null
      state.catalog = []
      state.selectedSkinId = ''
      renderGame()
      showToast('Профіль завантажено.')
    } catch (error) {
      state.player = null
      renderGame()
      if (error.status === 401) showGate()
      showToast(error.message, 'error')
    } finally {
      button.disabled = false
    }
  })

  $('#economyForm').addEventListener('submit', event => {
    event.preventDefault()
    const operation = $('#economyOperation').value
    const amount = integer($('#economyAmount').value)
    if (!operation) return
    void mutateGame(operation, { amount }, { confirmText: operation.endsWith('_set') ? `Встановити баланс на ${compact(amount)} PC?` : '' })
  })

  $('#progressForm').addEventListener('submit', event => {
    event.preventDefault()
    const operation = $('#progressOperation').value
    const amount = integer($('#progressAmount').value)
    if (!operation) return
    void mutateGame(operation, { amount }, { confirmText: operation.endsWith('_set') ? 'Точно замінити значення прогресу?' : '' })
  })

  $('#passForm').addEventListener('submit', event => {
    event.preventDefault()
    const operation = $('#passOperation').value
    const amount = integer($('#passAmount').value)
    if (!operation) return
    void mutateGame(operation, { amount }, { confirmText: operation.endsWith('_set') ? 'Точно замінити XP Battle Pass?' : '' })
  })

  $('#prestigeForm').addEventListener('submit', event => {
    event.preventDefault()
    const amount = integer($('#prestigeAmount').value)
    void mutateGame('prestige_set', { amount }, { confirmText: `Встановити престиж P${compact(amount)}?` })
  })

  $('#premiumEnableButton').addEventListener('click', () => void mutateGame('premium_enable'))
  $('#premiumDisableButton').addEventListener('click', () => void mutateGame('premium_disable', {}, { confirmText: 'Вимкнути Battle Pass у цього профілю?' }))

  $('#skinSearch').addEventListener('input', event => {
    const query = event.target.value.trim()
    state.selectedSkinId = ''
    $('#grantSkinButton').disabled = true
    window.clearTimeout(skinSearchTimer)
    if (query.length < 2) {
      state.catalog = []
      skinSearchResults.innerHTML = '<p class="empty-line">Введи щонайменше 2 символи, щоб знайти скін.</p>'
      return
    }
    skinSearchResults.innerHTML = '<p class="loading-line"><i class="fa-solid fa-spinner fa-spin"></i> Шукаємо в каталозі…</p>'
    skinSearchTimer = window.setTimeout(async () => {
      try {
        const data = await api(`/api/admin/game/catalog?q=${encodeURIComponent(query)}`)
        if ($('#skinSearch').value.trim() !== query) return
        state.catalog = data.items || []
        renderCatalog()
      } catch (error) {
        skinSearchResults.innerHTML = `<p class="empty-line">${escapeHtml(error.message)}</p>`
      }
    }, 260)
  })

  skinSearchResults.addEventListener('click', event => {
    const button = event.target.closest('[data-skin-id]')
    if (!button || !canGame('grant')) return
    state.selectedSkinId = button.dataset.skinId || ''
    renderCatalog()
    $('#grantSkinButton').disabled = !state.selectedSkinId
  })

  $('#grantSkinButton').addEventListener('click', () => {
    const skin = state.catalog.find(item => item.id === state.selectedSkinId)
    if (!skin) return showToast('Спочатку вибери скін зі списку.', 'error')
    void mutateGame('skin_grant', { skinId: skin.id }, { confirmText: `Видати «${skin.name}» цьому профілю?` })
  })

  playerInventory.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-skin]')
    if (!button) return
    const item = button.closest('[data-item-id]')
    const itemId = item?.dataset.itemId || ''
    if (!itemId) return
    void mutateGame('skin_remove', { itemId }, { confirmText: 'Прибрати цей скін із серверного інвентарю? Цю дію не можна скасувати.' })
  })

  $('#copyInviteButton').addEventListener('click', async () => {
    const input = $('#inviteUrl')
    try {
      await navigator.clipboard.writeText(input.value)
    } catch {
      input.focus()
      input.select()
      document.execCommand('copy')
    }
    showToast('Одноразове посилання скопійовано.')
  })

  logoutButton.addEventListener('click', async () => {
    try { await api('/api/admin/logout', { method: 'POST', body: '{}' }) } catch {}
    state.me = null
    state.members = []
    state.roles = []
    state.assignableRoles = []
    state.audit = []
    state.gameCapabilities = {}
    state.player = null
    state.catalog = []
    state.selectedSkinId = ''
    showGate()
  })

  refreshButton.addEventListener('click', () => load({ quiet: false }))
  showGate()
  load({ quiet: true })
})()
