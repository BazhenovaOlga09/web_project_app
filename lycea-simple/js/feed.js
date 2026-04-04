import { posts as postsApi } from './api.js';
import { POSTS_PER_PAGE } from './constants.js';
import { commentWord } from './utils.js';
import { showToast } from './modal.js';
import { CURRENT_USER } from './auth.js';

export let feedPage = 1;
let feedCache = { posts: [], totalPages: 1 };

export async function renderFeed(groupFilter) {
  const list = document.getElementById('postList');
  list.innerHTML = '<div class="loading-placeholder">Загрузка...</div>';

  try {
    const data = await postsApi.list(feedPage, POSTS_PER_PAGE, groupFilter);
    feedCache = data;

    list.innerHTML = '';
    if (!data.posts.length) {
      list.innerHTML = '<div class="empty-state">Пока нет публикаций. Напишите первым! ✍️</div>';
    } else {
      data.posts.forEach((post) => list.appendChild(buildPostCard(post)));
    }

    renderPagination(data.page, data.totalPages);
    renderPostGroupSelect();
  } catch (err) {
    list.innerHTML = `<div class="error-state">Ошибка загрузки: ${err.message}</div>`;
    showToast('Не удалось загрузить ленту', 'error');
  }
}

function buildPostCard(post) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.id = 'post-' + post.id;

  const groupBadge = post.group
    ? `<span class="post-badge">${post.groupIcon || ''} ${post.group}</span>`
    : '';

  card.innerHTML = `
    <div class="post-header">
      <div class="avatar" style="background:${post.color};color:${post.colorText || '#fff'}">${post.initials}</div>
      <div class="post-meta">
        <div class="post-author">${post.author}</div>
        <div class="post-time">${post.time}</div>
      </div>
      ${groupBadge}
    </div>
    <div class="post-text">${post.text}</div>
    <div class="post-actions">
      <button class="action-btn ${post.liked ? 'liked' : ''}" data-action="like" data-id="${post.id}">
        ❤️ <span class="like-count">${post.likes_count ?? post.likes ?? 0}</span>
      </button>
      <button class="action-btn" data-action="comment" data-id="${post.id}">
        💬 <span class="comment-count">${commentWord(post.comments_count || 0)}</span>
      </button>
      <button class="action-btn" data-action="share">↗️ Поделиться</button>
    </div>
    <div class="comments-section" id="comments-${post.id}">
      <div class="comments-list"></div>
      <div class="comment-input-row">
        <input class="comment-input" id="cinput-${post.id}" placeholder="Написать комментарий...">
        <button class="btn btn-ghost btn-sm" data-addcomment="${post.id}">Отправить</button>
      </div>
    </div>`;

  card.querySelector('[data-action="like"]').addEventListener('click', function () {
    toggleLike(post.id, this);
  });
  card.querySelector('[data-action="comment"]').addEventListener('click', function () {
    toggleComments(post.id, this);
  });
  card.querySelector('[data-action="share"]').addEventListener('click', () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    showToast('Ссылка скопирована! 🔗', 'success');
  });
  card.querySelector(`[data-addcomment="${post.id}"]`).addEventListener('click', () =>
    addComment(post.id)
  );
  card.querySelector(`#cinput-${post.id}`).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addComment(post.id);
  });

  return card;
}

function buildCommentsHtml(comments) {
  return comments.map((c) => `
    <div class="comment-item">
      <div class="avatar" style="background:${c.color || 'var(--surface2)'};color:#fff;width:28px;height:28px;font-size:11px;border-radius:8px">
        ${c.initials || c.author.split(' ').map((w) => w[0]).join('').slice(0, 2)}
      </div>
      <div class="comment-body">
        <div class="comment-author">${c.author}</div>
        <div class="comment-text">${c.text}</div>
      </div>
    </div>`).join('');
}

async function toggleLike(postId, btn) {
  try {
    const { liked, likes } = await postsApi.like(postId);
    btn.classList.toggle('liked', liked);
    btn.querySelector('.like-count').textContent = likes;
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  }
}

async function toggleComments(postId, btn) {
  const section = document.getElementById('comments-' + postId);
  const isOpen  = section.classList.toggle('open');

  if (isOpen) {
    const list = section.querySelector('.comments-list');
    list.innerHTML = '<span style="color:var(--muted);font-size:13px">Загрузка...</span>';
    try {
      const comments = await postsApi.getComments(postId);
      list.innerHTML = buildCommentsHtml(comments);
      btn.querySelector('.comment-count').textContent = commentWord(comments.length);
      section.querySelector('.comment-input')?.focus();
    } catch {
      list.innerHTML = '';
    }
  }
}

async function addComment(postId) {
  const input = document.getElementById('cinput-' + postId);
  const text  = input.value.trim();
  if (!text) return;

  try {
    const comment = await postsApi.addComment(postId, text);
    input.value = '';

    const list = document.querySelector(`#comments-${postId} .comments-list`);
    list.insertAdjacentHTML('beforeend', buildCommentsHtml([comment]));

    const countEl = document.querySelector(`#post-${postId} .comment-count`);
    const current = parseInt(countEl.textContent) || 0;
    countEl.textContent = commentWord(current + 1);

    showToast('Комментарий добавлен ✓', 'success');
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  }
}

export async function publishPost() {
  const text    = document.getElementById('postText').value.trim();
  const groupId = document.getElementById('postGroup').value || null;

  if (!text) {
    showToast('Напишите что-нибудь 😊', 'error');
    return;
  }

  const btn = document.getElementById('publishBtn');
  btn.disabled = true;

  try {
    await postsApi.create({ text, group_id: groupId ? Number(groupId) : null });
    document.getElementById('postText').value = '';
    feedPage = 1;
    await renderFeed();
    showToast('Пост опубликован! 🎉', 'success');
  } catch (err) {
    showToast('Ошибка: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function renderPostGroupSelect() {
  try {
    const { groups } = await import('./groups.js');
    const allGroups  = await import('./api.js').then(m => m.groups.list());
    const sel = document.getElementById('postGroup');
    sel.innerHTML = '<option value="">📢 Общее</option>';
    allGroups
      .filter((g) => g.joined)
      .forEach((g) => {
        const o = document.createElement('option');
        o.value = g.id;
        o.textContent = `${g.icon} ${g.name}`;
        sel.appendChild(o);
      });
  } catch {  }
}

function renderPagination(page, totalPages) {
  const container = document.getElementById('feedPagination');
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.className = 'page-btn arrow';
  prev.textContent = '←';
  prev.disabled = page <= 1;
  prev.addEventListener('click', () => { feedPage--; renderFeed(); scrollToFeedTop(); });
  container.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    if (Math.abs(i - page) > 1 && i !== 1 && i !== totalPages) {
      const last = container.lastChild;
      if (last?.textContent !== '…') {
        const dots = document.createElement('span');
        dots.textContent = '…';
        dots.style.cssText = 'color:var(--muted);padding:0 4px;font-size:13px';
        container.appendChild(dots);
      }
      continue;
    }
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === page ? ' active' : '');
    btn.textContent = i;
    btn.addEventListener('click', () => { feedPage = i; renderFeed(); scrollToFeedTop(); });
    container.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn arrow';
  next.textContent = '→';
  next.disabled = page >= totalPages;
  next.addEventListener('click', () => { feedPage++; renderFeed(); scrollToFeedTop(); });
  container.appendChild(next);
}

function scrollToFeedTop() {
  document.getElementById('panel-feed')?.scrollTo({ top: 0, behavior: 'smooth' });
}