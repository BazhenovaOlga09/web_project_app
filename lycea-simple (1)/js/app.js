// /js/app.js
import { POSTS_PER_PAGE, AVATAR_PALETTE, MONTHS } from './constants.js';
import { formatDate, getCurrentTime, getInitials, paginate, commentWord } from './utils.js';
import * as Feed from './feed.js';
import * as Events from './events.js';
import * as Groups from './groups.js';
import * as Messages from './messages.js';
import * as Auth from './auth.js';
import * as Modal from './modal.js';

export let DATA = null;
export let USERS = [];

function navigate(tab) {
  document
    .querySelectorAll('.nav-item')
    .forEach((n) => n.classList.toggle('active', n.dataset.tab === tab));
  document
    .querySelectorAll('.tab')
    .forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  document
    .querySelectorAll('.panel')
    .forEach((p) => p.classList.toggle('active', p.id === 'panel-' + tab));
}

function init() {
  Feed.renderFeed(DATA);
  Events.renderEvents(DATA);
  Groups.renderGroups(DATA);
  Messages.renderMessages(DATA);

  const publishBtn = document.getElementById('publishBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => Feed.publishPost(DATA));
  }

  document.getElementById('loginBtn')?.addEventListener('click', () => Auth.doLogin(USERS, DATA));
  document
    .getElementById('registerBtn')
    ?.addEventListener('click', () => Auth.doRegister(USERS, DATA));
  document
    .getElementById('authSwitchLogin')
    ?.addEventListener('click', () => Auth.switchAuthTab('login'));
  document
    .getElementById('authSwitchRegister')
    ?.addEventListener('click', () => Auth.switchAuthTab('register'));
  document
    .getElementById('roleStudent')
    ?.addEventListener('click', () => Auth.selectRole('student'));
  document
    .getElementById('roleTeacher')
    ?.addEventListener('click', () => Auth.selectRole('teacher'));

  // Навигация по вкладкам
  document
    .querySelectorAll('.nav-item, .tab')
    .forEach((el) => el.addEventListener('click', () => navigate(el.dataset.tab)));

  // Чат
  document.getElementById('sendBtn')?.addEventListener('click', () => Messages.sendMessage(DATA));
  document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      Messages.sendMessage(DATA);
    }
  });

  // Закрытие модальных окон
  document.querySelectorAll('.modal-overlay').forEach((overlay) =>
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay.open').forEach((m) => m.classList.remove('open'));
  });
}

export async function loadData() {
  const res = await fetch('data.json');
  DATA = await res.json();

  DATA.posts = DATA.posts.map((p) => ({ ...p, comments: [...p.comments] }));
  DATA.groups = DATA.groups.map((g) => ({ ...g }));
  DATA.events = DATA.events.map((e) => ({ ...e }));
  DATA.contacts = DATA.contacts.map((c) => ({ ...c, messages: [...c.messages] }));
  DATA.activeContactId = DATA.contacts[0]?.id ?? null;

  init();
}

// Запуск
loadData();
