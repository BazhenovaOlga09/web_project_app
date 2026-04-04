const BASE = '/api';

export const token = {
  getAccess()  { return localStorage.getItem('access_token'); },
  getRefresh() { return localStorage.getItem('refresh_token'); },
  set(access, refresh) {
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },
  clear() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

async function request(method, path, body, retry = true) {
  const headers = { 'Content-Type': 'application/json' };
  const access = token.getAccess();
  if (access) headers['Authorization'] = `Bearer ${access}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(method, path, body, false);
    token.clear();
    window.location.reload();
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}

async function tryRefresh() {
  const refreshToken = token.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    token.set(data.accessToken, data.refreshToken);
    return true;
  } catch { return false; }
}

const get   = (path)       => request('GET',    path);
const post  = (path, body) => request('POST',   path, body);
const patch = (path, body) => request('PATCH',  path, body);
const del   = (path)       => request('DELETE', path);

export const auth = {
  register: (body)         => post('/auth/register', body),
  login:    (body)         => post('/auth/login',    body),
  logout:   (refreshToken) => post('/auth/logout',   { refreshToken }),
  refresh:  (refreshToken) => post('/auth/refresh',  { refreshToken }),
};

export const posts = {
  list:        (page = 1, limit = 10, group_id) =>
    get(`/posts?page=${page}&limit=${limit}${group_id ? '&group_id=' + group_id : ''}`),
  get:         (id)       => get(`/posts/${id}`),
  create:      (body)     => post('/posts', body),
  update:      (id, body) => patch(`/posts/${id}`, body),
  remove:      (id)       => del(`/posts/${id}`),
  like:        (id)       => post(`/posts/${id}/like`),
  getComments: (id)       => get(`/posts/${id}/comments`),
  addComment:  (id, text) => post(`/posts/${id}/comments`, { text }),
};

export const groups = {
  list:   ()         => get('/groups'),
  get:    (id)       => get(`/groups/${id}`),
  create: (body)     => post('/groups', body),
  update: (id, body) => patch(`/groups/${id}`, body),
  remove: (id)       => del(`/groups/${id}`),
  join:   (id)       => post(`/groups/${id}/join`),
};

export const events = {
  list:   ()     => get('/events'),
  create: (body) => post('/events', body),
  remove: (id)   => del(`/events/${id}`),
  attend: (id)   => post(`/events/${id}/attend`),
};

export const messages = {
  contacts: ()             => get('/messages/contacts'),
  history:  (userId)       => get(`/messages/${userId}`),
  send:     (userId, text) => post(`/messages/${userId}`, { text }),
};

export const mail = {
  inbox:    ()     => get('/mail/inbox'),
  sent:     ()     => get('/mail/sent'),
  send:     (body) => post('/mail/send', body),
  markRead: (id)   => patch(`/mail/${id}/read`),
};

export const users = {
  list:   ()  => get('/messages/users'),
  search: (q) => get(`/messages/users?q=${encodeURIComponent(q)}`),
};

export const profile = {
  me:         ()     => get('/profile/me'),
  get:        (id)   => get(`/profile/${id}`),
  updateMe:   (body) => patch('/profile/me', body),
};