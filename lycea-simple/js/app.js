import * as Feed     from './feed.js';
import * as Events   from './events.js';
import * as Groups   from './groups.js';
import * as Messages from './messages.js';
import * as Auth     from './auth.js';
import * as Mail     from './mail.js';

function navigate(tab) {
  document.querySelectorAll('.nav-item')
    .forEach((n) => n.classList.toggle('active', n.dataset.tab === tab));
  document.querySelectorAll('.tab')
    .forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.panel')
    .forEach((p) => p.classList.toggle('active', p.id === 'panel-' + tab));

  if (tab === 'mail') Mail.renderMail();
}

function injectMailTab() {
  const tabBar = document.querySelector('.tab-bar');
  if (tabBar && !tabBar.querySelector('[data-tab="mail"]')) {
    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.dataset.tab = 'mail';
    tab.textContent = 'Почта';
    tabBar.appendChild(tab);
    tab.addEventListener('click', () => navigate('mail'));
  }

  const sidebar = document.querySelector('.sidebar');
  const sep = sidebar?.querySelector('.sidebar-sep');
  if (sidebar && sep && !sidebar.querySelector('.nav-item[data-tab="mail"]')) {
    const navItem = document.createElement('div');
    navItem.className = 'nav-item';
    navItem.dataset.tab = 'mail';
    navItem.innerHTML = '<span class="nav-icon">✉️</span> Почта';
    navItem.addEventListener('click', () => navigate('mail'));
    sidebar.insertBefore(navItem, sep);
  }

  const main = document.querySelector('.main');
  if (main && !document.getElementById('panel-mail')) {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panel-mail';
    main.appendChild(panel);
  }
}

function addFeedStyles() {
  const style = document.createElement('style');
  style.textContent = `.post-card { margin-bottom: 16px; }`;
  document.head.appendChild(style);
}

function init() {
  addFeedStyles();
  injectMailTab();

  document.getElementById('publishBtn')
    ?.addEventListener('click', () => Feed.publishPost());

  document.getElementById('loginBtn')
    ?.addEventListener('click', () => Auth.doLogin());
  document.getElementById('registerBtn')
    ?.addEventListener('click', () => Auth.doRegister());
  document.getElementById('authSwitchLogin')
    ?.addEventListener('click', () => Auth.switchAuthTab('login'));
  document.getElementById('authSwitchRegister')
    ?.addEventListener('click', () => Auth.switchAuthTab('register'));
  document.getElementById('roleStudent')
    ?.addEventListener('click', () => Auth.selectRole('student'));
  document.getElementById('roleTeacher')
    ?.addEventListener('click', () => Auth.selectRole('teacher'));

  document.getElementById('logoutBtn')
    ?.addEventListener('click', () => Auth.doLogout());

  document.getElementById('openGroupModalBtn')
    ?.addEventListener('click', () => {
      document.getElementById('groupModal').classList.add('open');
    });
  document.getElementById('closeGroupModalBtn')
    ?.addEventListener('click', () => {
      document.getElementById('groupModal').classList.remove('open');
    });

  document.getElementById('openEventModalBtn')
    ?.addEventListener('click', () => {
      document.getElementById('eventModal').classList.add('open');
    });
  document.getElementById('closeEventModalBtn')
    ?.addEventListener('click', () => {
      document.getElementById('eventModal').classList.remove('open');
    });

  document.getElementById('createGroupBtn')
    ?.addEventListener('click', () => Groups.createGroup());
  document.getElementById('createEventBtn')
    ?.addEventListener('click', () => Events.createEvent());

  document.querySelectorAll('.nav-item[data-tab], .tab[data-tab]').forEach((el) =>
    el.addEventListener('click', () => navigate(el.dataset.tab))
  );

  document.getElementById('sendBtn')
    ?.addEventListener('click', () => Messages.sendMessage());
  document.getElementById('chatInput')
    ?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        Messages.sendMessage();
      }
    });

  document.querySelectorAll('.modal-overlay').forEach((overlay) =>
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay.open')
        .forEach((m) => m.classList.remove('open'));
  });
}

init();

Auth.tryRestoreSession().then((restored) => {
  if (!restored) {
    const screen = document.getElementById('authScreen');
    if (screen) screen.style.display = 'flex';
  }
});