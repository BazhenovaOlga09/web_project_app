
import { getInitials } from './utils.js';
import { AVATAR_PALETTE } from './constants.js';
import { showToast } from './modal.js';
import { renderFeed } from './feed.js';
import { renderGroups } from './groups.js';
import { renderMessages } from './messages.js';

export let selectedRole = 'student';
export let CURRENT_USER = null;

export function selectRole(role) {
  selectedRole = role;
  document.getElementById('roleStudent').classList.toggle('selected', role === 'student');
  document.getElementById('roleTeacher').classList.toggle('selected', role === 'teacher');
  document.getElementById('classField').style.display = role === 'student' ? '' : 'none';
  document.getElementById('subjectField').style.display = role === 'teacher' ? '' : 'none';
}

export function switchAuthTab(tab) {
  document
    .querySelectorAll('.auth-tab')
    .forEach((t, i) => t.classList.toggle('active', (i === 0) === (tab === 'login')));
  document.getElementById('loginForm').classList.toggle('active', tab === 'login');
  document.getElementById('registerForm').classList.toggle('active', tab === 'register');
}

export function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

export function doLogin(USERS, DATA) {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) {
    showAuthError('loginError', 'Заполните все поля');
    return;
  }
  const user = USERS.find((u) => u.email === email && u.password === password);
  if (!user) {
    showAuthError('loginError', 'Неверный email или пароль');
    return;
  }
  loginUser(user, DATA);
}

export function doRegister(USERS, DATA) {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
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
  if (USERS.find((u) => u.email === email)) {
    showAuthError('regError', 'Этот email уже зарегистрирован');
    return;
  }

  const initials = getInitials(name);
  const color = AVATAR_PALETTE[USERS.length % AVATAR_PALETTE.length];
  const user = { id: Date.now(), name, email, password, role: selectedRole, initials, color };

  if (selectedRole === 'student') {
    const num = document.getElementById('regClassNum').value.trim();
    const letter = document.getElementById('regClassLetter').value.trim().toUpperCase();
    user.classLabel = num && letter ? `${num}${letter}` : '';
  } else {
    user.subject = document.getElementById('regSubject').value.trim();
  }

  USERS.push(user);
  loginUser(user, DATA);
}

export function loginUser(user, DATA) {
  CURRENT_USER = user;
  DATA.me = { id: user.id, name: user.name, initials: user.initials, color: user.color };

  document.getElementById('sidebarAvatar').textContent = user.initials;
  document.getElementById('sidebarAvatar').style.background = user.color;
  document.getElementById('sidebarName').textContent = user.name;
  document.getElementById('sidebarRole').textContent =
    user.role === 'teacher'
      ? user.subject
        ? `${user.subject} · преподаватель`
        : 'Преподаватель'
      : user.classLabel
        ? `${user.classLabel} · ученик`
        : 'Ученик';

  document.getElementById('composerAvatar').textContent = user.initials;
  document.getElementById('composerAvatar').style.background = user.color;

  const screen = document.getElementById('authScreen');
  screen.classList.add('hiding');
  setTimeout(() => (screen.style.display = 'none'), 400);
  showToast(`Добро пожаловать, ${user.name.split(' ')[0]}! 👋`, 'success');

  renderFeed(DATA);
  renderGroups(DATA);
  renderMessages(DATA);
}

export function doLogout() {
  CURRENT_USER = null;
  const screen = document.getElementById('authScreen');
  screen.style.display = 'flex';
  requestAnimationFrame(() => screen.classList.remove('hiding'));
}
