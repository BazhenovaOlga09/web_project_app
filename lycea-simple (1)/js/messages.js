
import { getCurrentTime } from './utils.js';

export function renderMessages(DATA) {
  const list = document.getElementById('msgContactList');
  list.innerHTML = '';
  DATA.contacts.forEach((c) => {
    const lastMsg = c.messages[c.messages.length - 1];
    const item = document.createElement('div');
    item.className = 'msg-item' + (c.id === DATA.activeContactId ? ' active' : '');
    item.id = 'contact-' + c.id;
    item.innerHTML = `
      <div class="avatar" style="background:${c.color};color:${c.colorText}">${c.initials}</div>
      <div class="msg-item-info">
        <div class="msg-item-name">${c.name}</div>
        <div class="msg-item-preview">${lastMsg ? (lastMsg.out ? 'Вы: ' : '') + lastMsg.text : '—'}</div>
      </div>
      ${c.unread > 0 ? `<span class="msg-unread">${c.unread}</span>` : ''}`;
    item.addEventListener('click', () => openChat(c.id, DATA));
    list.appendChild(item);
  });
  openChat(DATA.activeContactId, DATA);
  updateMsgBadge(DATA);
}

export function openChat(contactId, DATA) {
  DATA.activeContactId = contactId;
  const c = DATA.contacts.find((x) => x.id === contactId);
  if (!c) return;
  c.unread = 0;
  updateMsgBadge(DATA);
  document
    .querySelectorAll('.msg-item')
    .forEach((el) => el.classList.toggle('active', el.id === 'contact-' + contactId));
  document.querySelector(`#contact-${contactId} .msg-unread`)?.remove();
  document.getElementById('chatAvatar').textContent = c.initials;
  document.getElementById('chatAvatar').style.background = c.color;
  document.getElementById('chatAvatar').style.color = c.colorText;
  document.getElementById('chatName').textContent = c.name;
  document.getElementById('chatStatus').textContent = '● ' + c.status;
  const area = document.getElementById('chatMessages');
  area.innerHTML = '';
  c.messages.forEach((m) => area.appendChild(buildBubble(m)));
  area.scrollTop = area.scrollHeight;
}

export function buildBubble(m) {
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap ' + (m.out ? 'out' : 'inc');
  wrap.innerHTML = `<div class="msg-bubble">${m.text}</div><div class="bubble-time">${m.time}</div>`;
  return wrap;
}

export function sendMessage(DATA) {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  const c = DATA.contacts.find((x) => x.id === DATA.activeContactId);
  if (!c) return;
  const msg = { out: true, text, time: getCurrentTime() };
  c.messages.push(msg);
  const area = document.getElementById('chatMessages');
  area.appendChild(buildBubble(msg));
  area.scrollTop = area.scrollHeight;
  input.value = '';
  const preview = document.querySelector(`#contact-${c.id} .msg-item-preview`);
  if (preview) preview.textContent = 'Вы: ' + text;
}

export function updateMsgBadge(DATA) {
  const total = DATA.contacts.reduce((s, c) => s + c.unread, 0);
  const badge = document.getElementById('msgBadge');
  badge.textContent = total;
  badge.style.display = total > 0 ? '' : 'none';
}
