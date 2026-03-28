
import { POSTS_PER_PAGE } from './constants.js';
import { paginate, commentWord } from './utils.js';
import { showToast } from './modal.js';

export let feedPage = 1;

export function renderFeed(DATA) {
  const { items, page, totalPages, hasPrev, hasNext } = paginate(
    DATA.posts,
    feedPage,
    POSTS_PER_PAGE
  );
  feedPage = page;

  const list = document.getElementById('postList');
  list.innerHTML = '';
  items.forEach((post) => list.appendChild(buildPostCard(post, DATA)));

  renderPagination(page, totalPages, hasPrev, hasNext, DATA);
  renderPostGroupSelect(DATA);
}

function renderPostGroupSelect(DATA) {
  const sel = document.getElementById('postGroup');
  sel.innerHTML = '<option value="">📢 Общее</option>';
  DATA.groups
    .filter((g) => g.joined)
    .forEach((g) => {
      const o = document.createElement('option');
      o.value = g.id;
      o.textContent = g.icon + ' ' + g.name;
      sel.appendChild(o);
    });
}

function renderPagination(page, totalPages, hasPrev, hasNext, DATA) {
  const container = document.getElementById('feedPagination');
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.className = 'page-btn arrow';
  prev.textContent = '←';
  prev.disabled = !hasPrev;
  prev.addEventListener('click', () => {
    feedPage--;
    renderFeed(DATA);
    scrollToFeedTop();
  });
  container.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    const isNearCurrent = Math.abs(i - page) <= 1;
    const isEdge = i === 1 || i === totalPages;
    if (!isNearCurrent && !isEdge) {
      const last = container.lastChild;
      if (last && last.textContent !== '…') {
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
    btn.addEventListener('click', () => {
      feedPage = i;
      renderFeed(DATA);
      scrollToFeedTop();
    });
    container.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn arrow';
  next.textContent = '→';
  next.disabled = !hasNext;
  next.addEventListener('click', () => {
    feedPage++;
    renderFeed(DATA);
    scrollToFeedTop();
  });
  container.appendChild(next);
}

function scrollToFeedTop() {
  document.getElementById('panel-feed').scrollTo({ top: 0, behavior: 'smooth' });
}

export function buildPostCard(post, DATA) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.id = 'post-' + post.id;

  const groupBadge = post.group
    ? `<span class="post-badge">${post.groupIcon} ${post.group}</span>`
    : '';
  const commentsHtml = buildCommentsHtml(post.comments);

  card.innerHTML = `
    <div class="post-header">
      <div class="avatar" style="background:${post.color};color:${post.colorText}">${post.initials}</div>
      <div class="post-meta">
        <div class="post-author">${post.author}</div>
        <div class="post-time">${post.time}</div>
      </div>
      ${groupBadge}
    </div>
    <div class="post-text">${post.text}</div>
    <div class="post-actions">
      <button class="action-btn ${post.liked ? 'liked' : ''}" data-action="like" data-id="${post.id}">
        ❤️ <span class="like-count">${post.likes}</span>
      </button>
      <button class="action-btn" data-action="comment" data-id="${post.id}">
        💬 <span class="comment-count">${commentWord(post.comments.length)}</span>
      </button>
      <button class="action-btn" data-action="share">↗️ Поделиться</button>
    </div>
    <div class="comments-section" id="comments-${post.id}">
      <div class="comments-list">${commentsHtml}</div>
      <div class="comment-input-row">
        <input class="comment-input" id="cinput-${post.id}" placeholder="Написать комментарий...">
        <button class="btn btn-ghost btn-sm" data-addcomment="${post.id}">Отправить</button>
      </div>
    </div>`;

  card.querySelector('[data-action="like"]').addEventListener('click', function () {
    toggleLike(post.id, this, DATA);
  });
  card.querySelector('[data-action="comment"]').addEventListener('click', function () {
    toggleComments(post.id, this, DATA);
  });
  card
    .querySelector('[data-action="share"]')
    .addEventListener('click', () => showToast('Ссылка скопирована! 🔗', 'success'));
  card
    .querySelector(`[data-addcomment="${post.id}"]`)
    .addEventListener('click', () => addComment(post.id, DATA));
  card.querySelector(`#cinput-${post.id}`).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addComment(post.id, DATA);
  });

  return card;
}

function buildCommentsHtml(comments) {
  return comments
    .map(
      (c) => `
    <div class="comment-item">
      <div class="avatar" style="background:var(--surface2);color:var(--muted);width:28px;height:28px;font-size:11px;border-radius:8px">
        ${c.author
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)}
      </div>
      <div class="comment-body">
        <div class="comment-author">${c.author}</div>
        <div class="comment-text">${c.text}</div>
      </div>
    </div>`
    )
    .join('');
}

export function toggleLike(postId, btn, DATA) {
  const post = DATA.posts.find((p) => p.id === postId);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  btn.classList.toggle('liked', post.liked);
  btn.querySelector('.like-count').textContent = post.likes;
}

export function toggleComments(postId, btn, DATA) {
  const section = document.getElementById('comments-' + postId);
  const isOpen = section.classList.toggle('open');
  const post = DATA.posts.find((p) => p.id === postId);
  if (post) btn.querySelector('.comment-count').textContent = commentWord(post.comments.length);
  if (isOpen) document.getElementById('cinput-' + postId)?.focus();
}

export function addComment(postId, DATA) {
  const input = document.getElementById('cinput-' + postId);
  const text = input.value.trim();
  if (!text) return;
  const post = DATA.posts.find((p) => p.id === postId);
  if (!post) return;
  post.comments.push({ author: DATA.me.name, text });
  input.value = '';
  document.querySelector(`#comments-${postId} .comments-list`).innerHTML = buildCommentsHtml(
    post.comments
  );
  document.querySelector(`#post-${postId} .comment-count`).textContent = commentWord(
    post.comments.length
  );
  showToast('Комментарий добавлен ✓', 'success');
}

export function publishPost(DATA) {
  const text = document.getElementById('postText').value.trim();
  if (!text) {
    showToast('Напишите что-нибудь 😊', 'error');
    return;
  }

  const groupId = document.getElementById('postGroup').value;
  const group = DATA.groups.find((g) => String(g.id) === String(groupId));

  DATA.posts.unshift({
    id: Date.now(),
    author: DATA.me.name,
    initials: DATA.me.initials,
    color: DATA.me.color,
    colorText: '#fff',
    group: group ? group.name : '',
    groupIcon: group ? group.icon : '',
    time: 'только что',
    text,
    likes: 0,
    liked: false,
    comments: [],
  });

  document.getElementById('postText').value = '';
  feedPage = 1;
  renderFeed(DATA);
  showToast('Пост опубликован! 🎉', 'success');
}
