import { messages as msgApi, users as usersApi } from './api.js';
import { getCurrentTime } from './utils.js';
import { showToast } from './modal.js';
import { CURRENT_USER } from './auth.js';
import { openUserProfile } from './profile.js';

let activeContactId = null;
let allContacts = [];

export async function renderMessages() {
  const list = document.getElementById('msgContactList');
  list.innerHTML = '<div class="loading-placeholder">Загрузка...</div>';

  injectUserSearch();

  try {
    allContacts = await msgApi.contacts();
    renderContactList(allContacts);
    updateMsgBadge(allContacts);

    if (!activeContactId && allContacts.length) {
      const first = allContacts[0];
      openChat(Number(first.partner_id), first.partner_name, first.partner_color, first.partner_initials);
    }
  } catch (err) {
    list.innerHTML = `<div class="error-state" style="padding:16px">${err.message}</div>`;
  }
}

function injectUserSearch() {
  if (document.getElementById('userSearch')) return;

  const header = document.querySelector('.msg-list-header');
  if (!header) return;

  const input = document.createElement('input');
  input.id = 'userSearch';
  input.className = 'form-input';
  input.placeholder = '🔍 Имя, класс, предмет...';
  input.style.cssText = 'width:100%;margin-top:8px;padding:6px 10px;font-size:12px;box-sizing:border-box';
  header.after(input);

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => searchUsers(input.value.trim()), 300);
  });
}

async function searchUsers(q) {
  const list = document.getElementById('msgContactList');
  if (!q) {
    renderContactList(allContacts);
    return;
  }
  try {
    const results = await usersApi.search(q);
    list.innerHTML = '';
    if (!results.length) {
      list.innerHTML = '<div style="padding:12px;font-size:13px;color:var(--muted)">Никого не найдено</div>';
      return;
    }
    results.forEach(u => {
      const item = document.createElement('div');
      item.className = 'msg-item';
      const sub = u.role === 'teacher'
        ? (u.subject || 'Преподаватель')
        : (u.class_label || 'Ученик');
      item.innerHTML = `
        <div class="avatar" style="background:${u.color || '#888'};color:#fff;cursor:pointer" data-uid="${u.id}">${u.initials || '?'}</div>
        <div class="msg-item-info" style="cursor:pointer" data-uid="${u.id}">
          <div class="msg-item-name">${u.name}</div>
          <div class="msg-item-preview" style="font-size:11px">${sub}</div>
        </div>`;
      item.querySelector('[data-uid]').addEventListener('click', () => {
        document.getElementById('userSearch').value = '';
        openChat(Number(u.id), u.name, u.color, u.initials);
        renderContactList(allContacts);
      });
      item.querySelectorAll('[data-uid]')[1]?.addEventListener('click', () => {
        document.getElementById('userSearch').value = '';
        openChat(Number(u.id), u.name, u.color, u.initials);
        renderContactList(allContacts);
      });
      list.appendChild(item);
    });
  } catch (err) {
    showToast('Ошибка поиска: ' + err.message, 'error');
  }
}

function renderContactList(contacts) {
  const list = document.getElementById('msgContactList');
  list.innerHTML = '';

  if (!contacts.length) {
    list.innerHTML = '<div style="padding:16px;font-size:13px;color:var(--muted)">Нет пользователей</div>';
    return;
  }

  contacts.forEach((c) => {
    const partnerId = Number(c.partner_id);
    const item = document.createElement('div');
    item.className = 'msg-item' + (partnerId === activeContactId ? ' active' : '');
    item.id = 'contact-' + partnerId;
    item.innerHTML = `
      <div class="avatar" style="background:${c.partner_color || '#888'};color:#fff;cursor:pointer" data-uid="${partnerId}">
        ${c.partner_initials || '?'}
      </div>
      <div class="msg-item-info">
        <div class="msg-item-name" style="cursor:pointer" data-uid="${partnerId}">${c.partner_name}</div>
        <div class="msg-item-preview">${c.last_text || 'Начните переписку'}</div>
      </div>
      ${c.unread_count > 0 ? `<span class="msg-unread">${c.unread_count}</span>` : ''}`;

    item.querySelector('.msg-item-info').addEventListener('click', (e) => {
      if (e.target.dataset.uid) {
        openUserProfile(partnerId);
      } else {
        openChat(partnerId, c.partner_name, c.partner_color, c.partner_initials);
      }
    });
    item.querySelector('.avatar').addEventListener('click', () => openUserProfile(partnerId));
    item.addEventListener('click', (e) => {
      if (!e.target.dataset.uid) {
        openChat(partnerId, c.partner_name, c.partner_color, c.partner_initials);
      }
    });
    list.appendChild(item);
  });
}

export async function openChat(userId, name, color, initials) {
  activeContactId = Number(userId);

  document.querySelectorAll('.msg-item').forEach((el) =>
    el.classList.toggle('active', el.id === 'contact-' + activeContactId)
  );
  document.querySelector(`#contact-${activeContactId} .msg-unread`)?.remove();

  const chatHeader = document.querySelector('.chat-header');
  const chatAvatar = document.getElementById('chatAvatar');
  const chatName   = document.getElementById('chatName');

  chatAvatar.textContent      = initials || '?';
  chatAvatar.style.background = color || '#888';
  chatAvatar.style.color      = '#fff';
  chatAvatar.style.cursor     = 'pointer';
  chatName.textContent        = name || '';
  chatName.style.cursor       = 'pointer';
  document.getElementById('chatStatus').textContent = '● В сети';

  chatAvatar.onclick = () => openUserProfile(activeContactId);
  chatName.onclick   = () => openUserProfile(activeContactId);

  const area = document.getElementById('chatMessages');
  area.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:13px">Загрузка...</div>';

  try {
    const msgs = await msgApi.history(activeContactId);
    area.innerHTML = '';
    msgs.forEach((m) => area.appendChild(buildBubble(m)));
    area.scrollTop = area.scrollHeight;
  } catch (err) {
    area.innerHTML = `<div style="padding:16px;color:red">${err.message}</div>`;
  }
}

function buildBubble(m) {
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap ' + (m.out ? 'out' : 'inc');
  const time = m.created_at
    ? new Date(m.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    : getCurrentTime();
  wrap.innerHTML = `
    <div class="msg-bubble">${m.text}</div>
    <div class="bubble-time">${time}</div>`;
  return wrap;
}

export async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || !activeContactId) return;

  input.value = '';

  const area = document.getElementById('chatMessages');
  const bubble = buildBubble({ out: true, text, created_at: null });
  area.appendChild(bubble);
  area.scrollTop = area.scrollHeight;

  const preview = document.querySelector(`#contact-${activeContactId} .msg-item-preview`);
  if (preview) preview.textContent = 'Вы: ' + text;

  try {
    await msgApi.send(activeContactId, text);
  } catch (err) {
    showToast('Не удалось отправить: ' + err.message, 'error');
    bubble.remove();
    input.value = text;
  }
}

function updateMsgBadge(contacts) {
  const total = contacts.reduce((s, c) => s + (c.unread_count || 0), 0);
  const badge = document.getElementById('msgBadge');
  if (badge) {
    badge.textContent   = total;
    badge.style.display = total > 0 ? '' : 'none';
  }
}