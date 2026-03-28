
import { showToast, closeModal } from './modal.js';
import { renderFeed } from './feed.js';

export function renderGroups(DATA) {
  const container = document.getElementById('groupsList');
  container.innerHTML = '';
  DATA.groups.forEach((g) => container.appendChild(buildGroupCard(g, DATA)));
  renderMyGroupsSidebar(DATA);
}

export function buildGroupCard(g, DATA) {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.id = 'group-' + g.id;
  card.innerHTML = `
    <div class="group-icon-wrap" style="background:${g.color}">${g.icon}</div>
    <div class="group-name">${g.name}</div>
    <div class="group-desc">${g.desc}</div>
    <div class="group-footer">
      <span class="group-members-count">👥 ${g.members} участн.</span>
      <button class="join-btn ${g.joined ? 'joined' : ''}" data-gid="${g.id}">
        ${g.joined ? 'Вступил' : 'Вступить'}
      </button>
    </div>`;
  card.querySelector(`[data-gid="${g.id}"]`).addEventListener('click', function () {
    toggleJoin(g.id, this, card, DATA);
  });
  return card;
}

export function toggleJoin(groupId, btn, card, DATA) {
  const g = DATA.groups.find((x) => x.id === groupId);
  if (!g) return;
  g.joined = !g.joined;
  g.members += g.joined ? 1 : -1;
  btn.textContent = g.joined ? 'Вступил' : 'Вступить';
  btn.classList.toggle('joined', g.joined);
  card.querySelector('.group-members-count').textContent = `👥 ${g.members} участн.`;
  renderMyGroupsSidebar(DATA);
  renderFeed(DATA);
  showToast(
    g.joined ? `Добро пожаловать в «${g.name}»! 🎉` : `Вы покинули «${g.name}»`,
    g.joined ? 'success' : ''
  );
}

export function renderMyGroupsSidebar(DATA) {
  const container = document.getElementById('myGroupsList');
  container.innerHTML = '';
  DATA.groups
    .filter((g) => g.joined)
    .forEach((g) => {
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.innerHTML = `<span class="nav-icon">${g.icon}</span> ${g.name}`;
      el.addEventListener('click', () => navigate('groups'));
      container.appendChild(el);
    });
}

export function createGroup(DATA) {
  const name = document.getElementById('newGroupName').value.trim();
  const desc = document.getElementById('newGroupDesc').value.trim();
  const icon = document.getElementById('newGroupIcon').value.trim() || '💡';
  if (!name) {
    showToast('Введите название группы', 'error');
    return;
  }
  const colors = [
    'rgba(124,110,247,0.15)',
    'rgba(247,168,110,0.15)',
    'rgba(86,217,156,0.15)',
    'rgba(110,200,247,0.15)',
  ];
  const g = {
    id: Date.now(),
    name,
    desc,
    icon,
    color: colors[DATA.groups.length % colors.length],
    members: 1,
    joined: true,
  };
  DATA.groups.unshift(g);
  const container = document.getElementById('groupsList');
  container.insertBefore(buildGroupCard(g, DATA), container.firstChild);
  renderMyGroupsSidebar(DATA);
  renderFeed(DATA);
  closeModal('groupModal');
  ['newGroupName', 'newGroupDesc', 'newGroupIcon'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  showToast(`Группа «${name}» создана! 🎯`, 'success');
}
