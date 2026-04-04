import { events as eventsApi, groups as groupsApi } from './api.js';
import { showToast, closeModal } from './modal.js';
import { MONTHS } from './constants.js';
import { CURRENT_USER } from './auth.js';

export async function renderEvents() {
  const container = document.getElementById('eventsList');
  container.innerHTML = '<div class="loading-placeholder">Загрузка...</div>';

  const createBtn = document.getElementById('openEventModalBtn');
  if (createBtn) {
    createBtn.style.display = CURRENT_USER?.role === 'teacher' ? '' : 'none';
  }

  try {
    const list = await eventsApi.list();
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = '<div class="empty-state">Нет мероприятий</div>';
    } else {
      list.forEach((ev) => container.appendChild(buildEventCard(ev)));
    }
    await fillGroupSelect();
  } catch (err) {
    container.innerHTML = `<div class="error-state">${err.message}</div>`;
  }
}

function buildEventCard(ev) {
  const d = new Date(ev.event_date);
  const day        = d.getDate();
  const month      = MONTHS[d.getMonth()];
  const groupLabel = ev.groupName || ev.group || 'Общелицейское';
  const groupIcon  = ev.groupIcon || '📢';
  const isTeacher  = CURRENT_USER?.role === 'teacher';

  const card = document.createElement('div');
  card.className = `event-card color-${ev.color}`;
  card.id = 'event-' + ev.id;
  card.innerHTML = `
    <div class="event-date-num">${day}</div>
    <div class="event-month-label">${month}${ev.location ? ' · ' + ev.location : ''}</div>
    <div class="event-title">${ev.title}</div>
    <div class="event-desc">${ev.description || ev.desc || ''}</div>
    <div class="event-footer">
      <span class="event-group-tag">${groupIcon} ${groupLabel}</span>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="going-btn ${ev.going ? 'going' : ''}" data-evid="${ev.id}">
          ${ev.going ? '✓ Иду' : 'Пойду'}
        </button>
        ${isTeacher ? `<button class="btn btn-ghost btn-sm" data-deleteid="${ev.id}" style="color:var(--danger,#e74c3c);padding:4px 10px">🗑</button>` : ''}
      </div>
    </div>`;

  card.querySelector(`[data-evid="${ev.id}"]`).addEventListener('click', function () {
    toggleGoing(ev.id, this);
  });

  if (isTeacher) {
    card.querySelector(`[data-deleteid="${ev.id}"]`).addEventListener('click', () => {
      deleteEvent(ev.id, ev.title, card);
    });
  }

  return card;
}

async function toggleGoing(evId, btn) {
  btn.disabled = true;
  try {
    const { going } = await eventsApi.attend(evId);
    btn.classList.toggle('going', going);
    btn.textContent = going ? '✓ Иду' : 'Пойду';
    showToast(going ? '✓ Ты записан(а)!' : 'Запись отменена', going ? 'success' : '');
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteEvent(evId, title, card) {
  if (!confirm(`Удалить мероприятие «${title}»?`)) return;
  try {
    await eventsApi.remove(evId);
    card.remove();
    showToast('Мероприятие удалено', 'success');
    const container = document.getElementById('eventsList');
    if (!container.children.length) {
      container.innerHTML = '<div class="empty-state">Нет мероприятий</div>';
    }
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  }
}

export async function createEvent() {
  const title      = document.getElementById('newEventTitle').value.trim();
  const desc       = document.getElementById('newEventDesc').value.trim();
  const event_date = document.getElementById('newEventDate').value;
  const location   = document.getElementById('newEventLocation').value.trim();
  const groupSel   = document.getElementById('newEventGroup');
  const group_id   = groupSel?.value ? Number(groupSel.value) : null;

  if (!title)      { showToast('Введите название мероприятия', 'error'); return; }
  if (!event_date) { showToast('Выберите дату', 'error'); return; }

  try {
    const ev = await eventsApi.create({ title, description: desc, event_date, location, group_id });
    const container = document.getElementById('eventsList');
    const empty = container.querySelector('.empty-state');
    if (empty) empty.remove();
    container.insertBefore(buildEventCard(ev), container.firstChild);
    closeModal('eventModal');
    ['newEventTitle','newEventDesc','newEventDate','newEventLocation'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    showToast(`Мероприятие «${title}» создано! 📅`, 'success');
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  }
}

async function fillGroupSelect() {
  const sel = document.getElementById('newEventGroup');
  if (!sel) return;
  sel.innerHTML = '<option value="">📢 Общелицейское</option>';
  try {
    const list = await groupsApi.list();
    list.forEach((g) => {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = `${g.icon} ${g.name}`;
      sel.appendChild(o);
    });
  } catch {}
}