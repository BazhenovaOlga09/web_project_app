import { profile as profileApi } from './api.js';
import { showToast } from './modal.js';
import { CURRENT_USER } from './auth.js';

let modalEl = null;

function getModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.className = 'modal-overlay';
  modalEl.id = 'profileModal';
  modalEl.innerHTML = `
    <div class="modal" style="min-width:320px;max-width:420px">
      <div id="profileModalContent"></div>
    </div>`;
  document.body.appendChild(modalEl);
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeProfileModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfileModal();
  });
  return modalEl;
}

function closeProfileModal() {
  if (modalEl) modalEl.classList.remove('open');
}

export async function openUserProfile(userId) {
  const modal = getModal();
  const content = document.getElementById('profileModalContent');
  content.innerHTML = '<div class="loading-placeholder" style="padding:24px">Загрузка...</div>';
  modal.classList.add('open');

  try {
    const user = await profileApi.get(userId);
    const isMe = CURRENT_USER?.id === user.id;
    const sub = user.role === 'teacher'
      ? (user.subject ? `Преподаватель · ${user.subject}` : 'Преподаватель')
      : (user.class_label ? `Ученик · ${user.class_label}` : 'Ученик');

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div class="avatar" style="width:56px;height:56px;font-size:20px;border-radius:16px;background:${user.color};color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${user.initials}
        </div>
        <div>
          <div style="font-weight:700;font-size:17px">${user.name}</div>
          <div style="font-size:13px;color:var(--muted);margin-top:2px">${sub}</div>
        </div>
      </div>
      ${user.bio ? `<div style="font-size:14px;color:var(--text);margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:10px;line-height:1.5">${user.bio}</div>` : ''}
      <div style="display:flex;gap:8px;justify-content:flex-end">
        ${isMe
          ? `<button class="btn btn-primary btn-sm" id="editMyProfileBtn">✏️ Редактировать</button>`
          : `<button class="btn btn-primary btn-sm" id="msgFromProfileBtn">💬 Написать</button>`
        }
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('profileModal').classList.remove('open')">Закрыть</button>
      </div>`;

    if (isMe) {
      document.getElementById('editMyProfileBtn').addEventListener('click', () => {
        closeProfileModal();
        openEditProfile(user);
      });
    } else {
      document.getElementById('msgFromProfileBtn').addEventListener('click', () => {
        closeProfileModal();
        import('./messages.js').then(m => {
          document.querySelectorAll('.nav-item').forEach(n =>
            n.classList.toggle('active', n.dataset.tab === 'messages')
          );
          document.querySelectorAll('.tab, .panel').forEach(p => {
            p.classList.toggle('active',
              p.dataset?.tab === 'messages' || p.id === 'panel-messages'
            );
          });
          m.openChat(user.id, user.name, user.color, user.initials);
        });
      });
    }
  } catch (err) {
    content.innerHTML = `<div style="padding:24px;color:red">${err.message}</div>`;
  }
}

export function openEditProfile(userData) {
  const modal = getModal();
  const content = document.getElementById('profileModalContent');
  const isTeacher = userData.role === 'teacher';

  content.innerHTML = `
    <div class="modal-title">✏️ Редактировать профиль</div>
    <div class="form-group">
      <label class="form-label">Имя и фамилия</label>
      <input class="form-input" id="editName" value="${userData.name || ''}" />
    </div>
    ${isTeacher
      ? `<div class="form-group">
           <label class="form-label">Предмет(ы)</label>
           <input class="form-input" id="editSubject" value="${userData.subject || ''}" />
         </div>`
      : `<div class="form-group">
           <label class="form-label">Класс</label>
           <input class="form-input" id="editClassLabel" value="${userData.class_label || ''}" placeholder="10А" style="width:100px"/>
         </div>`
    }
    <div class="form-group">
      <label class="form-label">О себе</label>
      <textarea class="form-textarea" id="editBio" placeholder="Напиши пару слов о себе..." style="min-height:90px">${userData.bio || ''}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="document.getElementById('profileModal').classList.remove('open')">Отмена</button>
      <button class="btn btn-primary" id="saveProfileBtn">Сохранить →</button>
    </div>`;

  modal.classList.add('open');

  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;

    const body = {
      name: document.getElementById('editName').value.trim(),
      bio:  document.getElementById('editBio').value.trim(),
    };
    if (isTeacher) {
      body.subject = document.getElementById('editSubject').value.trim();
    } else {
      body.class_label = document.getElementById('editClassLabel').value.trim();
    }

    try {
      const updated = await profileApi.updateMe(body);

      const avatar = document.getElementById('sidebarAvatar');
      const nameEl = document.getElementById('sidebarName');
      const roleEl = document.getElementById('sidebarRole');
      if (avatar) avatar.textContent = updated.initials;
      if (nameEl) nameEl.textContent = updated.name;
      if (roleEl) roleEl.textContent = isTeacher
        ? (updated.subject ? `${updated.subject} · преподаватель` : 'Преподаватель')
        : (updated.class_label ? `${updated.class_label} · ученик` : 'Ученик');

      Object.assign(CURRENT_USER, updated);
      closeProfileModal();
      showToast('Профиль обновлён ✓', 'success');
    } catch (err) {
      showToast('Ошибка: ' + err.message, 'error');
      btn.disabled = false;
    }
  });
}