
import { MONTHS } from './constants.js';

export function formatDate(dateStr) {
  if (!dateStr) return { day: '—', month: '' };
  const [, m, d] = dateStr.split('-');
  return { day: parseInt(d, 10), month: MONTHS[parseInt(m, 10) - 1] };
}

export function getCurrentTime() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getInitials(name) {
  return name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function paginate(items, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function commentWord(n) {
  if (n === 1) return '1 ответ';
  if (n >= 2 && n <= 4) return `${n} ответа`;
  return `${n} ответов`;
}
