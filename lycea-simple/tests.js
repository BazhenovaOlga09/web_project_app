let passed = 0;
let failed = 0;


function expect(description, condition) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ПРОВАЛ: ${description}`);
    failed++;
  }
}


function describe(groupName, fn) {
  console.groupCollapsed(`📦 ${groupName}`);
  fn();
  console.groupEnd();
}


function formatDate(dateStr) {
  if (!dateStr) return { day: '—', month: '' };
  const MONTHS = [
    'ЯНВ',
    'ФЕВ',
    'МАР',
    'АПР',
    'МАЙ',
    'ИЮН',
    'ИЮЛ',
    'АВГ',
    'СЕН',
    'ОКТ',
    'НОЯ',
    'ДЕК',
  ];
  const [, m, d] = dateStr.split('-');
  return { day: parseInt(d, 10), month: MONTHS[parseInt(m, 10) - 1] };
}

function getInitials(name) {
  return name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function paginate(items, page, perPage) {
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

function commentWord(n) {
  if (n === 1) return '1 ответ';
  if (n >= 2 && n <= 4) return `${n} ответа`;
  return `${n} ответов`;
}

function validateEmail(email) {
  return typeof email === 'string' && email.includes('@') && email.includes('.');
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function validateRegister({ name, email, password }) {
  if (!name || !email || !password) return { ok: false, error: 'Заполните все поля' };
  if (!validateEmail(email)) return { ok: false, error: 'Некорректный email' };
  if (!validatePassword(password)) return { ok: false, error: 'Пароль минимум 6 символов' };
  return { ok: true };
}



console.log('\n🧪 Запуск unit-тестов лицей.сеть\n');

describe('formatDate — форматирование даты', () => {
  const mar = formatDate('2025-03-07');
  expect('день равен 7', mar.day === 7);
  expect('месяц равен МАР', mar.month === 'МАР');

  const dec = formatDate('2025-12-31');
  expect('декабрь → ДЕК', dec.month === 'ДЕК');
  expect('день 31', dec.day === 31);

  const empty = formatDate('');
  expect('пустая строка → day "—"', empty.day === '—');

  const nul = formatDate(null);
  expect('null → day "—"', nul.day === '—');
});


describe('getInitials — инициалы из имени', () => {
  expect('"Артём Козлов" → "АК"', getInitials('Артём Козлов') === 'АК');
  expect('"Мария Смирнова" → "МС"', getInitials('Мария Смирнова') === 'МС');
  expect('одно слово "Иван" → "И"', getInitials('Иван') === 'И');
  expect('три слова → берём только 2', getInitials('Иван Иванович Иванов') === 'ИИ');
  expect('строчные → заглавные', getInitials('anna petrov') === 'AP');
  expect('пробелы по краям обрезаются', getInitials('  Анна Белова  ') === 'АБ');
});


describe('paginate — пагинация массива', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  const p1 = paginate(items, 1, 10);
  expect('страница 1: 10 элементов', p1.items.length === 10);
  expect('страница 1: первый элемент 1', p1.items[0] === 1);
  expect('страница 1: нет предыдущей', p1.hasPrev === false);
  expect('страница 1: есть следующая', p1.hasNext === true);
  expect('всего 3 страницы', p1.totalPages === 3);

  const p2 = paginate(items, 2, 10);
  expect('страница 2: первый элемент 11', p2.items[0] === 11);
  expect('страница 2: есть предыдущая', p2.hasPrev === true);
  expect('страница 2: есть следующая', p2.hasNext === true);

  const p3 = paginate(items, 3, 10);
  expect('страница 3: 5 элементов (остаток)', p3.items.length === 5);
  expect('страница 3: нет следующей', p3.hasNext === false);


  const big = paginate(items, 999, 10);
  expect('page=999 → отдаёт последнюю страницу', big.page === 3);

  const neg = paginate(items, -5, 10);
  expect('page=-5 → отдаёт первую страницу', neg.page === 1);


  const empty = paginate([], 1, 10);
  expect('пустой массив → 0 элементов', empty.items.length === 0);
  expect('пустой массив → totalPages = 1', empty.totalPages === 1);
});

describe('commentWord — правильное склонение', () => {
  expect('0 → "0 ответов"', commentWord(0) === '0 ответов');
  expect('1 → "1 ответ"', commentWord(1) === '1 ответ');
  expect('2 → "2 ответа"', commentWord(2) === '2 ответа');
  expect('4 → "4 ответа"', commentWord(4) === '4 ответа');
  expect('5 → "5 ответов"', commentWord(5) === '5 ответов');
  expect('11 → "11 ответов"', commentWord(11) === '11 ответов');
  expect('21 → "21 ответов"', commentWord(21) === '21 ответов');
});


describe('validateEmail — проверка email', () => {
  expect('корректный email', validateEmail('test@lyceum.ru') === true);
  expect('без @ — не валидный', validateEmail('testlyceum.ru') === false);
  expect('без точки — не валидный', validateEmail('test@lyceum') === false);
  expect('пустая строка', validateEmail('') === false);
  expect('не строка (число)', validateEmail(123) === false);
});

describe('validatePassword — проверка пароля', () => {
  expect('6 символов — ок', validatePassword('abc123') === true);
  expect('7 символов — ок', validatePassword('abc1234') === true);
  expect('5 символов — недостаточно', validatePassword('ab123') === false);
  expect('пустая строка', validatePassword('') === false);
  expect('не строка', validatePassword(null) === false);
});


describe('validateRegister — проверка формы регистрации', () => {
  const good = validateRegister({ name: 'Анна', email: 'anna@test.ru', password: 'secret1' });
  expect('все поля верные → ok: true', good.ok === true);

  const noName = validateRegister({ name: '', email: 'anna@test.ru', password: 'secret1' });
  expect('пустое имя → ошибка', noName.ok === false);

  const badEmail = validateRegister({ name: 'Анна', email: 'notanemail', password: 'secret1' });
  expect('плохой email → ошибка', badEmail.ok === false);

  const shortPwd = validateRegister({ name: 'Анна', email: 'anna@test.ru', password: '123' });
  expect('короткий пароль → ошибка', shortPwd.ok === false);
  expect('текст ошибки упоминает "6"', shortPwd.error.includes('6'));
});


console.log(`\n${'─'.repeat(40)}`);
console.log(`Итог: ✅ ${passed} прошло  ❌ ${failed} упало`);
if (failed === 0) {
  console.log('%c Все тесты прошли! 🎉', 'color: #56d99c; font-weight: bold; font-size: 14px');
} else {
  console.error(`Провалилось тестов: ${failed}`);
}
