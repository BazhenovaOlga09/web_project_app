import { groups as groupsApi } from './api.js';
import { showToast, closeModal } from './modal.js';

let allGroupsCache = [];

export async function renderGroups() {
  const container = document.getElementById('groupsList');
  container.innerHTML = '<div class="loading-placeholder">Загрузка...</div>';

  injectGroupSearch();

  try {
    allGroupsCache = await groupsApi.list();
    renderGroupList(allGroupsCache);
    renderMyGroupsSidebar(allGroupsCache);
  } catch (err) {
    container.innerHTML = `<div class="error-state">Ошибка: ${err.message}</div>`;
    showToast('Не удалось загрузить группы', 'error');
  }
}

function injectGroupSearch() {
  const header = document.querySelector('#panel-groups .panel-header');
  if (!header || header.querySelector('#groupSearch')) return;

  const input = document.createElement('input');
  input.id = 'groupSearch';
  input.className = 'form-input';
  input.placeholder = '🔍 Поиск по названию...';
  input.style.cssText = 'width:220px;padding:6px 12px;font-size:13px;margin-left:auto;margin-right:8px';
  header.insertBefore(input, header.querySelector('#openGroupModalBtn') || header.lastChild);

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const filtered = q
      ? allGroupsCache.filter(g => g.name.toLowerCase().includes(q))
      : allGroupsCache;
    renderGroupList(filtered);
  });
}

function renderGroupList(list) {
  const container = document.getElementById('groupsList');
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<div class="empty-state" style="padding:24px;color:var(--muted)">Группы не найдены</div>';
    return;
  }
  list.forEach((g) => container.appendChild(buildGroupCard(g)));
}

function buildGroupCard(g) {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.id = 'group-' + g.id;
  card.innerHTML = `
    <div class="group-icon-wrap" style="background:${g.color}">${g.icon}</div>
    <div class="group-name">${g.name}</div>
    <div class="group-desc">${g.description || g.desc || ''}</div>
    <div class="group-footer">
      <span class="group-members-count">👥 ${g.members_count} участн.</span>
      <button class="join-btn ${g.joined ? 'joined' : ''}" data-gid="${g.id}">
        ${g.joined ? 'Вступил' : 'Вступить'}
      </button>
    </div>`;
  card.querySelector(`[data-gid="${g.id}"]`).addEventListener('click', function () {
    toggleJoin(g.id, this, card);
  });
  return card;
}

async function toggleJoin(groupId, btn, card) {
  btn.disabled = true;
  try {
    const { joined, members_count } = await groupsApi.join(groupId);
    btn.textContent = joined ? 'Вступил' : 'Вступить';
    btn.classList.toggle('joined', joined);
    card.querySelector('.group-members-count').textContent = `👥 ${members_count} участн.`;

    allGroupsCache = await groupsApi.list();
    renderMyGroupsSidebar(allGroupsCache);

    const groupName = card.querySelector('.group-name').textContent;
    showToast(
      joined ? `Добро пожаловать в «${groupName}»! 🎉` : `Вы покинули «${groupName}»`,
      joined ? 'success' : ''
    );
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

function renderMyGroupsSidebar(list) {
  const container = document.getElementById('myGroupsList');
  container.innerHTML = '';
  list.filter((g) => g.joined).forEach((g) => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.innerHTML = `<span class="nav-icon">${g.icon}</span> ${g.name}`;
    el.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      document.querySelectorAll('.tab, .panel').forEach(p => {
        p.classList.toggle('active', p.dataset?.tab === 'groups' || p.id === 'panel-groups');
      });
    });
    container.appendChild(el);
  });
}

export async function createGroup() {
  const name        = document.getElementById('newGroupName').value.trim();
  const description = document.getElementById('newGroupDesc').value.trim();
  const icon        = document.getElementById('newGroupIcon').value.trim() || '💡';

  if (!name) { showToast('Введите название группы', 'error'); return; }

  const btn = document.querySelector('#groupModal .btn-primary');
  if (btn) btn.disabled = true;

  try {
    const group = await groupsApi.create({ name, description, icon });
    allGroupsCache = await groupsApi.list();
    renderGroupList(allGroupsCache);
    renderMyGroupsSidebar(allGroupsCache);
    closeModal('groupModal');
    ['newGroupName', 'newGroupDesc', 'newGroupIcon'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    showToast(`Группа «${name}» создана! 🎯`, 'success');
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}