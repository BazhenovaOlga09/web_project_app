import { auth as authApi, token } from './api.js';
import { getInitials } from './utils.js';
import { AVATAR_PALETTE } from './constants.js';
import { showToast } from './modal.js';
import { renderFeed } from './feed.js';
import { renderGroups } from './groups.js';
import { renderMessages } from './messages.js';
import { renderEvents } from './events.js';
import { openEditProfile } from './profile.js';

export let selectedRole  = 'student';
export let CURRENT_USER  = null;

export function selectRole(role) {
  selectedRole = role;
  document.getElementById('roleStudent').classList.toggle('selected', role === 'student');
  document.getElementById('roleTeacher').classList.toggle('selected', role === 'teacher');
  document.getElementById('classField').style.display   = role === 'student' ? '' : 'none';
  document.getElementById('subjectField').style.display = role === 'teacher' ? '' : 'none';
}

export function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab')
    .forEach((t, i) => t.classList.toggle('active', (i === 0) === (tab === 'login')));
  document.getElementById('loginForm').classList.toggle('active',    tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
}

export function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

export async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showAuthError('loginError', 'Заполните все поля');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Входим...';

  try {
    const { user, accessToken, refreshToken } = await authApi.login({ email, password });
    token.set(accessToken, refreshToken);
    loginUser(user);
  } catch (err) {
    showAuthError('loginError', err.message || 'Неверный email или пароль');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
}

export async function doRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;

  if (!name || !email || !password) {
    showAuthError('regError', 'Заполните все поля');
    return;
  }
  if (password.length < 6) {
    showAuthError('regError', 'Пароль минимум 6 символов');
    return;
  }
  if (!email.includes('@')) {
    showAuthError('regError', 'Введите корректный email');
    return;
  }

  const body = { name, email, password, role: selectedRole };

  if (selectedRole === 'student') {
    const num    = document.getElementById('regClassNum').value.trim();
    const letter = document.getElementById('regClassLetter').value.trim().toUpperCase();
    body.class_label = num && letter ? `${num}${letter}` : '';
  } else {
    body.subject = document.getElementById('regSubject').value.trim();
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'Регистрация...';

  try {
    const { user, accessToken, refreshToken } = await authApi.register(body);
    token.set(accessToken, refreshToken);
    loginUser(user);
  } catch (err) {
    showAuthError('regError', err.message || 'Ошибка регистрации');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Зарегистрироваться';
  }
}

export function loginUser(user) {
  CURRENT_USER = user;

  document.getElementById('sidebarAvatar').textContent      = user.initials;
  document.getElementById('sidebarAvatar').style.background = user.color;
  document.getElementById('sidebarName').textContent        = user.name;
  document.getElementById('sidebarRole').textContent        =
    user.role === 'teacher'
      ? (user.subject ? `${user.subject} · преподаватель` : 'Преподаватель')
      : (user.class_label ? `${user.class_label} · ученик` : 'Ученик');

  document.getElementById('composerAvatar').textContent      = user.initials;
  document.getElementById('composerAvatar').style.background = user.color;

  const screen = document.getElementById('authScreen');
  screen.classList.add('hiding');
  setTimeout(() => (screen.style.display = 'none'), 400);

  const sidebarAvatar = document.getElementById('sidebarAvatar');
  if (sidebarAvatar) {
    sidebarAvatar.style.cursor = 'pointer';
    sidebarAvatar.onclick = () => {
      import('./profile.js').then(m => m.openEditProfile(CURRENT_USER));
    };
  }

  const createEventBtn = document.getElementById('openEventModalBtn');
  if (createEventBtn) {
    createEventBtn.style.display = user.role === 'teacher' ? '' : 'none';
  }

  showToast(`Добро пожаловать, ${user.name.split(' ')[0]}! 👋`, 'success');

  renderFeed();
  renderGroups();
  renderMessages();
  renderEvents();
}

export async function doLogout() {
  const refreshToken = token.getRefresh();
  await authApi.logout(refreshToken).catch(() => {});
  token.clear();
  CURRENT_USER = null;

  const screen = document.getElementById('authScreen');
  screen.style.display = 'flex';
  requestAnimationFrame(() => screen.classList.remove('hiding'));
}

export async function tryRestoreSession() {
  const accessToken = token.getAccess();
  if (!accessToken) return false;

  try {

    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {

      const refreshToken = token.getRefresh();
      if (!refreshToken) return false;
      const { accessToken: newAccess, refreshToken: newRefresh } =
        await authApi.refresh(refreshToken);
      token.set(newAccess, newRefresh);
      const newPayload = JSON.parse(atob(newAccess.split('.')[1]));
      loginUser(newPayload);
    } else {
      loginUser(payload);
    }
    return true;
  } catch {
    token.clear();
    return false;
  }
}