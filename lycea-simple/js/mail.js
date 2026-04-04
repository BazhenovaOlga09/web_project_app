import { mail as mailApi, users as usersApi } from './api.js';
import { showToast } from './modal.js';

let allUsers = [];
let currentTab = 'inbox';

export async function renderMail() {
  await loadUsers();
  renderMailTabs();
  loadInbox();
}

async function loadUsers() {
  try {
    allUsers = await usersApi.list();
  } catch {}
}

function renderMailTabs() {
  const panel = document.getElementById('panel-mail');
  if (!panel || panel.dataset.initialized) return;
  panel.dataset.initialized = 'true';

  panel.innerHTML = `
    <div class="panel-content">
      <div class="panel-header">
        <div class="mail-tabs">
          <button class="btn btn-ghost btn-sm mail-tab-btn active" data-tab="inbox">📥 Входящие</button>
          <button class="btn btn-ghost btn-sm mail-tab-btn" data-tab="sent">📤 Отправленные</button>
        </div>
        <button class="btn btn-primary btn-sm" id="openComposeBtn">✏️ Написать</button>
      </div>
      <div id="mailList" style="margin-top:16px"></div>
    </div>

    <div class="modal-overlay" id="composeModal">
      <div class="modal">
        <div class="modal-title">✉️ Новое письмо</div>
        <div class="form-group">
          <label class="form-label">Кому</label>
          <select class="form-select" id="mailReceiver"></select>
        </div>
        <div class="form-group">
          <label class="form-label">Тема</label>
          <input class="form-input" id="mailSubject" placeholder="Тема письма" />
        </div>
        <div class="form-group">
          <label class="form-label">Сообщение</label>
          <textarea class="form-textarea" id="mailText" placeholder="Текст письма..." style="min-height:120px"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="closeComposeBtn">Отмена</button>
          <button class="btn btn-primary" id="sendMailBtn">Отправить →</button>
        </div>
      </div>
    </div>`;

  panel.querySelectorAll('.mail-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('.mail-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      if (currentTab === 'inbox') loadInbox();
      else loadSent();
    });
  });

  document.getElementById('openComposeBtn').addEventListener('click', openCompose);
  document.getElementById('closeComposeBtn').addEventListener('click', () => {
    document.getElementById('composeModal').classList.remove('open');
  });
  document.getElementById('sendMailBtn').addEventListener('click', sendMail);
  document.getElementById('composeModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('composeModal'))
      document.getElementById('composeModal').classList.remove('open');
  });
}

async function loadInbox() {
  const list = document.getElementById('mailList');
  list.innerHTML = '<div class="loading-placeholder">Загрузка...</div>';
  try {
    const mails = await mailApi.inbox();
    renderMailList(mails, 'inbox');
  } catch (err) {
    list.innerHTML = `<div class="error-state">${err.message}</div>`;
  }
}

async function loadSent() {
  const list = document.getElementById('mailList');
  list.innerHTML = '<div class="loading-placeholder">Загрузка...</div>';
  try {
    const mails = await mailApi.sent();
    renderMailList(mails, 'sent');
  } catch (err) {
    list.innerHTML = `<div class="error-state">${err.message}</div>`;
  }
}

function renderMailList(mails, type) {
  const list = document.getElementById('mailList');
  list.innerHTML = '';

  if (!mails.length) {
    list.innerHTML = '<div class="empty-state" style="padding:24px;color:var(--muted);text-align:center">Писем нет</div>';
    return;
  }

  mails.forEach(m => {
    const item = document.createElement('div');
    item.className = 'post-card';
    item.style.cssText = 'cursor:pointer;' + (!m.is_read && type === 'inbox' ? 'border-left:3px solid var(--accent)' : '');

    const person = type === 'inbox'
      ? { name: m.sender_name, initials: m.sender_initials, color: m.sender_color, label: 'От' }
      : { name: m.receiver_name, initials: m.receiver_initials, color: m.receiver_color, label: 'Кому' };

    const date = new Date(m.created_at).toLocaleString('ru', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    item.innerHTML = `
      <div class="post-header">
        <div class="avatar" style="background:${person.color || '#888'};color:#fff">${person.initials || '?'}</div>
        <div class="post-meta">
          <div class="post-author">${person.label}: ${person.name}</div>
          <div class="post-time">${date}</div>
        </div>
        ${!m.is_read && type === 'inbox' ? '<span style="background:var(--accent);color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600">Новое</span>' : ''}
      </div>
      <div style="font-weight:600;margin-bottom:6px">📌 ${m.subject}</div>
      <div class="post-text" style="color:var(--muted)">${m.text}</div>`;

    if (type === 'inbox' && !m.is_read) {
      item.addEventListener('click', async () => {
        await mailApi.markRead(m.id).catch(() => {});
        item.style.borderLeft = '';
        item.querySelector('[style*="Новое"]')?.remove();
      });
    }

    list.appendChild(item);
  });
}

function openCompose() {
  const sel = document.getElementById('mailReceiver');
  sel.innerHTML = '<option value="">Выберите получателя...</option>';
  allUsers.forEach(u => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = u.name;
    sel.appendChild(o);
  });
  document.getElementById('mailSubject').value = '';
  document.getElementById('mailText').value = '';
  document.getElementById('composeModal').classList.add('open');
}

async function sendMail() {
  const receiver_id = Number(document.getElementById('mailReceiver').value);
  const subject     = document.getElementById('mailSubject').value.trim();
  const text        = document.getElementById('mailText').value.trim();

  if (!receiver_id) { showToast('Выберите получателя', 'error'); return; }
  if (!subject)     { showToast('Введите тему', 'error'); return; }
  if (!text)        { showToast('Введите текст письма', 'error'); return; }

  const btn = document.getElementById('sendMailBtn');
  btn.disabled = true;

  try {
    await mailApi.send({ receiver_id, subject, text });
    document.getElementById('composeModal').classList.remove('open');
    showToast('Письмо отправлено! ✉️', 'success');
    if (currentTab === 'sent') loadSent();
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}