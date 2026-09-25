(() => {
  'use strict'

  const state = { me: null, members: [], roles: [], assignableRoles: [], audit: [] }
  const $ = selector => document.querySelector(selector)
  const headerStatus = $('#headerStatus')
  const accessNotice = $('#accessNotice')
  const teamList = $('#teamList')
  const auditList = $('#auditList')
  const roleSelect = $('#memberRole')
  const form = $('#memberForm')
  const submitButton = $('#memberSubmit')
  const refreshButton = $('#refreshButton')
  const toastRegion = $('#toastRegion')

  const actionLabels = {
    access_granted: 'надав(ла) доступ',
    role_updated: 'оновив(ла) роль',
    access_suspended: 'призупинив(ла) доступ',
    access_activated: 'відновив(ла) доступ',
    access_revoked: 'прибрав(ла) доступ',
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

  function renderIdentity() {
    const me = state.me
    $('#myRole').textContent = roleName(me?.role)
    $('#myEmail').textContent = me?.email || '—'
    $('#myRoleDescription').textContent = me?.role?.description || 'Панель очікує підтвердження особи.'
  }

  function renderRoleSelect() {
    const allowed = state.roles.filter(role => state.assignableRoles.includes(role.id))
    roleSelect.replaceChildren()
    if (!allowed.length) {
      const option = new Option('Твоя роль не видає доступи', '')
      roleSelect.add(option)
      roleSelect.disabled = true
      submitButton.disabled = true
      return
    }
    allowed.forEach(role => roleSelect.add(new Option(role.label, role.id)))
    roleSelect.disabled = false
    submitButton.disabled = false
  }

  function renderRoles() {
    const root = $('#rolesOverview')
    root.innerHTML = state.roles.map(role => `
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
        <div><strong class="member-name">${escapeHtml(member.name || (member.protected ? 'Власник' : 'Без імені'))}</strong><span class="member-email">${escapeHtml(member.email)}</span></div>
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
        <div><strong>${escapeHtml(entry.actorEmail)} ${escapeHtml(actionLabels[entry.action] || entry.action)}</strong><p>${entry.targetEmail ? `Для: ${escapeHtml(entry.targetEmail)}` : ''}${entry.detail ? `${entry.targetEmail ? ' · ' : ''}${escapeHtml(entry.detail)}` : ''}</p></div>
        <time datetime="${new Date(Number(entry.at) || 0).toISOString()}">${escapeHtml(formatTime(entry.at))}</time>
      </article>`).join('')
  }

  function renderAll() {
    renderIdentity()
    renderRoleSelect()
    renderRoles()
    renderTeam()
    renderAudit()
  }

  async function load() {
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
      renderAll()
      setHeader('Захищене з’єднання', 'ready')
    } catch (error) {
      setHeader('Доступ не підтверджено', 'error')
      setNotice(error.message.includes('Cloudflare Access')
        ? 'Cloudflare Access не підтвердив твою особу. Увійди через Access і перевір, що для /api/admin/* створено політику доступу.'
        : error.message)
      state.roles = []
      state.assignableRoles = []
      renderRoleSelect()
      teamList.innerHTML = '<p class="empty-line">Команда доступна лише після підтвердження прав.</p>'
      auditList.innerHTML = '<p class="empty-line">Журнал доступний лише після підтвердження прав.</p>'
      showToast(error.message, 'error')
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
      showToast(successMessage)
      return true
    } catch (error) {
      showToast(error.message, 'error')
      return false
    } finally {
      submitButton.disabled = !state.assignableRoles.length
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const email = $('#memberEmail').value.trim()
    const role = roleSelect.value
    const name = $('#memberName').value.trim()
    if (!email || !role) return
    const saved = await mutateMember({ action: 'grant', email, role, name }, 'Роль збережено. Не забудь дозволити цю пошту в Cloudflare Access.')
    if (saved) {
      form.reset()
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

  refreshButton.addEventListener('click', load)
  load()
})()
