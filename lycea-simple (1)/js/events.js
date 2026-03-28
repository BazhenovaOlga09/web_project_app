
import { formatDate } from './utils.js';
import { showToast, closeModal } from './modal.js';

export function renderEvents(DATA) {
  const container = document.getElementById('eventsList');
  container.innerHTML = '';

  const sel = document.getElementById('newEventGroup');
  sel.innerHTML = '<option value="Общелицейское">📢 Общелицейское</option>';
  DATA.groups.forEach((g) => {
    const o = document.createElement('option');
    o.value = g.name;
    o.textContent = g.icon + ' ' + g.name;
    sel.appendChild(o);
  });

  DATA.events.forEach((ev) => container.appendChild(buildEventCard(ev, DATA)));
}

export function buildEventCard(ev, DATA) {
  const { day, month } = formatDate(ev.date);
  const card = document.createElement('div');
  card.className = `event-card color-${ev.color}`;
  card.id = 'event-' + ev.id;
  card.innerHTML = `
    <div class="event-date-num">${day}</div>
    <div class="event-month-label">${month}${ev.location ? ' · ' + ev.location : ''}</div>
    <div class="event-title">${ev.title}</div>
    <div class="event-desc">${ev.desc}</div>
    <div class="event-footer">
      <span class="event-group-tag">${ev.group}</span>
      <button class="going-btn ${ev.going ? 'going' : ''}" data-evid="${ev.id}">
        ${ev.going ? '✓ Иду' : 'Пойду'}
      </button>
    </div>`;
  card.querySelector(`[data-evid="${ev.id}"]`).addEventListener('click', function () {
    toggleGoing(ev.id, this, DATA);
  });
  return card;
}

export function toggleGoing(evId, btn, DATA) {
  const ev = DATA.events.find((e) => e.id === evId);
  if (!ev) return;
  ev.going = !ev.going;
  btn.classList.toggle('going', ev.going);
  btn.textContent = ev.going ? '✓ Иду' : 'Пойду';
  showToast(ev.going ? '✓ Ты записан(а)!' : 'Запись отменена', ev.going ? 'success' : '');
}

export function createEvent(DATA) {
  const title = document.getElementById('newEventTitle').value.trim();
  const desc = document.getElementById('newEventDesc').value.trim();
  const date = document.getElementById('newEventDate').value;
  const location = document.getElementById('newEventLocation').value.trim();
  const group = document.getElementById('newEventGroup').value;
  if (!title) {
    showToast('Введите название мероприятия', 'error');
    return;
  }
  const colors = ['a', 'b', 'c', 'd'];
  const ev = {
    id: Date.now(),
    title,
    desc,
    date,
    location,
    group,
    going: false,
    color: colors[DATA.events.length % colors.length],
  };
  DATA.events.unshift(ev);
  const container = document.getElementById('eventsList');
  container.insertBefore(buildEventCard(ev, DATA), container.firstChild);
  closeModal('eventModal');
  ['newEventTitle', 'newEventDesc', 'newEventDate', 'newEventLocation'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  showToast('Мероприятие создано! 📅', 'success');
}
