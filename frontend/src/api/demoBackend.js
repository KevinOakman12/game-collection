/*
 * Демо-версия серверной части для статического сайта (GitHub Pages).
 * Подключается вместо HTTP-запросов как адаптер Axios, повторяет правила REST API
 * бэкенда (проверки, коды ответов, сообщения) и хранит данные в localStorage браузера.
 */
import { AxiosError } from 'axios';

import seed from './demoSeed.json';

const STORAGE_KEY = 'games_demo_db_v1';
const STATUSES = ['not_started', 'in_progress', 'completed', 'abandoned'];
const WISH_TYPES = ['buy', 'play'];
const URL_PATTERN = /^https?:\/\/\S+$/;

class HttpError extends Error {
  constructor(status, detail, errors) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.errors = errors;
  }
}

const now = () => new Date().toISOString();
const notFound = (detail) => new HttpError(404, detail);
const invalid = (detail) => new HttpError(422, detail);
const validation = (...fields) =>
  new HttpError(422, 'Проверьте правильность заполнения полей', fields.map((field) => ({ field, message: 'Некорректное значение' })));

// ---------- Хранилище ----------

function freshDb() {
  return {
    users: [],
    sessions: {},
    genres: seed.genres,
    platforms: seed.platforms,
    games: seed.games.map((game) => ({ ...game, created_at: now() })),
    collection: [],
    wishlist: [],
    nextId: { users: 1, games: seed.games.length + 1, collection: 1, wishlist: 1 },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Повреждённые или недоступные данные — начинаем с чистой базы
  }
  return freshDb();
}

function save(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Хранилище недоступно (например, приватный режим) — данные живут до перезагрузки
  }
}

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Представление данных как в схемах API ----------

const genreOf = (db, id) => db.genres.find((g) => g.id === id) ?? null;
const platformOf = (db, id) => db.platforms.find((p) => p.id === id) ?? null;

function gameRead(db, game) {
  return {
    id: game.id,
    title: game.title,
    description: game.description ?? null,
    release_year: game.release_year ?? null,
    developer: game.developer ?? null,
    cover_url: game.cover_url ?? null,
    genre: genreOf(db, game.genre_id),
    platforms: game.platform_ids.map((id) => platformOf(db, id)).sort((a, b) => (a.name < b.name ? -1 : 1)),
    is_custom: game.created_by !== null,
  };
}

// Запись коллекции или списка желаемого: вместо идентификаторов — вложенные игра и платформа
function itemRead(db, item) {
  const { user_id: _user, game_id: gameId, platform_id: platformId, ...fields } = item;
  const game = db.games.find((g) => g.id === gameId);
  return { ...fields, game: gameRead(db, game), platform: platformOf(db, platformId) };
}

const wishRead = itemRead;

const userRead = (user) => ({ id: user.id, username: user.username, email: user.email, created_at: user.created_at });

// ---------- Общие проверки ----------

function currentUser(db, config, required = true) {
  const header = config.headers?.get ? config.headers.get('Authorization') : config.headers?.Authorization;
  if (!header) {
    if (required) throw new HttpError(401, 'Требуется авторизация');
    return null;
  }
  const user = db.users.find((u) => u.id === db.sessions[header.replace('Bearer ', '')]);
  if (!user) throw new HttpError(401, 'Требуется авторизация');
  return user;
}

const isVisible = (game, user) => game.created_by === null || (user && game.created_by === user.id);

function visibleGame(db, id, user) {
  const game = db.games.find((g) => g.id === Number(id));
  if (!game || !isVisible(game, user)) throw notFound('Игра не найдена');
  return game;
}

function ensurePlatform(game, platformId) {
  if (!game.platform_ids.includes(Number(platformId))) throw invalid('Игра не выпускалась на выбранной платформе');
}

function ensureNotDuplicate(db, user, gameId, platformId, excludeId) {
  const duplicate = db.collection.some(
    (i) => i.user_id === user.id && i.game_id === gameId && i.platform_id === Number(platformId) && i.id !== excludeId,
  );
  if (duplicate) throw new HttpError(409, 'Эта игра на выбранной платформе уже есть в коллекции');
}

function checkHours(value) {
  if (value !== undefined && (typeof value !== 'number' || value < 0 || value > 100000)) throw validation('hours_played');
}

const contains = (title, search) => !search || title.toLowerCase().includes(String(search).trim().toLowerCase());

function parseBody(config) {
  if (!config.data) return {};
  if (typeof config.data !== 'string') return config.data;
  if (config.data.startsWith('{')) return JSON.parse(config.data);
  return Object.fromEntries(new URLSearchParams(config.data));
}

// ---------- Маршруты ----------

async function register(db, body) {
  const username = String(body.username ?? '');
  const email = String(body.email ?? '').toLowerCase();
  const password = String(body.password ?? '');
  const errors = [];
  if (!/^[A-Za-z0-9_]{3,50}$/.test(username)) errors.push('username');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');
  if (password.length < 6 || new TextEncoder().encode(password).length > 72) errors.push('password');
  if (errors.length) throw validation(...errors);

  const existing = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase() || u.email === email);
  if (existing) {
    const field = existing.username.toLowerCase() === username.toLowerCase() ? 'логином' : 'email';
    throw new HttpError(409, `Пользователь с таким ${field} уже существует`);
  }
  const salt = crypto.randomUUID();
  const user = { id: db.nextId.users++, username, email, salt, password_hash: await hashPassword(password, salt), created_at: now() };
  db.users.push(user);
  return { status: 201, data: userRead(user) };
}

async function login(db, body) {
  const login = String(body.username ?? '').trim().toLowerCase();
  const user = db.users.find((u) => u.username.toLowerCase() === login || u.email === login);
  if (!user || (await hashPassword(String(body.password ?? ''), user.salt)) !== user.password_hash) {
    throw new HttpError(401, 'Неверный логин или пароль');
  }
  const token = `demo-${crypto.randomUUID()}`;
  db.sessions[token] = user.id;
  return { status: 200, data: { access_token: token, token_type: 'bearer', user: userRead(user) } };
}

function listGames(db, params, user) {
  const page = Number(params.page ?? 1);
  const pageSize = Number(params.page_size ?? 12);
  const items = db.games
    .filter((g) => isVisible(g, user) && contains(g.title, params.search))
    .filter((g) => params.platform_id == null || g.platform_ids.includes(Number(params.platform_id)))
    .filter((g) => params.genre_id == null || g.genre_id === Number(params.genre_id))
    .filter((g) => !(String(params.only_custom) === 'true' && user) || g.created_by === user.id)
    .sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
  return {
    status: 200,
    data: {
      items: items.slice((page - 1) * pageSize, page * pageSize).map((g) => gameRead(db, g)),
      total: items.length,
      page,
      page_size: pageSize,
    },
  };
}

function validateGame(db, body, partial) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) errors.push('title');
  }
  if (body.cover_url && !URL_PATTERN.test(body.cover_url)) errors.push('cover_url');
  if (body.release_year != null && (body.release_year < 1950 || body.release_year > 2100)) errors.push('release_year');
  if (!partial || body.platform_ids !== undefined) {
    if (!Array.isArray(body.platform_ids) || body.platform_ids.length === 0) errors.push('platform_ids');
  }
  if (errors.length) throw validation(...errors);
  if (body.platform_ids && body.platform_ids.some((id) => !platformOf(db, id))) throw invalid('Указана несуществующая платформа');
  if (body.genre_id != null && !genreOf(db, body.genre_id)) throw invalid('Указан несуществующий жанр');
}

function ownCustomGame(db, id, user) {
  const game = visibleGame(db, id, user);
  if (game.created_by !== user.id) throw new HttpError(403, 'Игры публичной библиотеки нельзя изменять');
  return game;
}

const GAME_FIELDS = ['title', 'description', 'release_year', 'developer', 'cover_url', 'genre_id'];

function createGame(db, body, user) {
  validateGame(db, body, false);
  const game = { id: db.nextId.games++, created_by: user.id, created_at: now(), platform_ids: [...new Set(body.platform_ids)] };
  for (const field of GAME_FIELDS) game[field] = field === 'title' ? body.title.trim() : body[field] ?? null;
  db.games.push(game);
  return { status: 201, data: gameRead(db, game) };
}

function updateGame(db, id, body, user) {
  const game = ownCustomGame(db, id, user);
  validateGame(db, body, true);
  if (body.platform_ids) {
    const used = db.collection.filter((i) => i.user_id === user.id && i.game_id === game.id).map((i) => i.platform_id);
    if (used.some((pid) => !body.platform_ids.includes(pid))) {
      throw new HttpError(409, 'Нельзя убрать платформу, на которой игра есть в коллекции');
    }
    game.platform_ids = [...new Set(body.platform_ids)];
  }
  for (const field of GAME_FIELDS) {
    if (body[field] !== undefined) game[field] = field === 'title' ? body.title.trim() : body[field];
  }
  return { status: 200, data: gameRead(db, game) };
}

function deleteGame(db, id, user) {
  const game = ownCustomGame(db, id, user);
  db.games = db.games.filter((g) => g.id !== game.id);
  db.collection = db.collection.filter((i) => i.game_id !== game.id);
  db.wishlist = db.wishlist.filter((i) => i.game_id !== game.id);
  return { status: 204, data: '' };
}

const SORT_KEYS = {
  title: (db, i) => db.games.find((g) => g.id === i.game_id).title,
  hours: (db, i) => i.hours_played,
  updated: (db, i) => i.updated_at,
  added: (db, i) => i.added_at,
};

function listCollection(db, params, user) {
  const key = SORT_KEYS[params.sort ?? 'updated'];
  const direction = params.order === 'asc' ? 1 : -1;
  const items = db.collection
    .filter((i) => i.user_id === user.id)
    .filter((i) => contains(db.games.find((g) => g.id === i.game_id).title, params.search))
    .filter((i) => !params.status || i.status === params.status)
    .filter((i) => params.platform_id == null || i.platform_id === Number(params.platform_id))
    .sort((a, b) => {
      const x = key(db, a);
      const y = key(db, b);
      return x < y ? -direction : x > y ? direction : a.id - b.id;
    });
  return { status: 200, data: items.map((i) => itemRead(db, i)) };
}

function ownItem(list, id, user, detail) {
  const item = list.find((i) => i.id === Number(id));
  if (!item || item.user_id !== user.id) throw notFound(detail);
  return item;
}

function addToCollection(db, body, user) {
  if (body.status !== undefined && !STATUSES.includes(body.status)) throw validation('status');
  checkHours(body.hours_played);
  const game = visibleGame(db, body.game_id, user);
  ensurePlatform(game, body.platform_id);
  ensureNotDuplicate(db, user, game.id, body.platform_id);
  const item = {
    id: db.nextId.collection++,
    user_id: user.id,
    game_id: game.id,
    platform_id: Number(body.platform_id),
    status: body.status ?? 'not_started',
    hours_played: body.hours_played ?? 0,
    notes: body.notes ?? null,
    added_at: now(),
    updated_at: now(),
  };
  db.collection.push(item);
  return { status: 201, data: itemRead(db, item) };
}

function updateCollectionItem(db, id, body, user) {
  const item = ownItem(db.collection, id, user, 'Запись коллекции не найдена');
  if (body.status !== undefined && !STATUSES.includes(body.status)) throw validation('status');
  checkHours(body.hours_played);
  if (body.platform_id !== undefined && body.platform_id !== item.platform_id) {
    ensurePlatform(db.games.find((g) => g.id === item.game_id), body.platform_id);
    ensureNotDuplicate(db, user, item.game_id, body.platform_id, item.id);
  }
  for (const field of ['platform_id', 'status', 'hours_played', 'notes']) {
    if (body[field] !== undefined) item[field] = body[field];
  }
  item.updated_at = now();
  return { status: 200, data: itemRead(db, item) };
}

function listWishlist(db, params, user) {
  const items = db.wishlist
    .filter((i) => i.user_id === user.id && (!params.wish_type || i.wish_type === params.wish_type))
    .sort((a, b) => (a.added_at < b.added_at ? 1 : a.added_at > b.added_at ? -1 : b.id - a.id));
  return { status: 200, data: items.map((i) => wishRead(db, i)) };
}

function addToWishlist(db, body, user) {
  if (!WISH_TYPES.includes(body.wish_type)) throw validation('wish_type');
  const game = visibleGame(db, body.game_id, user);
  if (body.platform_id != null) ensurePlatform(game, body.platform_id);
  if (db.wishlist.some((i) => i.user_id === user.id && i.game_id === game.id)) {
    throw new HttpError(409, 'Игра уже есть в списке желаемого');
  }
  const item = {
    id: db.nextId.wishlist++,
    user_id: user.id,
    game_id: game.id,
    platform_id: body.platform_id ?? null,
    wish_type: body.wish_type,
    note: body.note ?? null,
    added_at: now(),
  };
  db.wishlist.push(item);
  return { status: 201, data: wishRead(db, item) };
}

function updateWish(db, id, body, user) {
  const item = ownItem(db.wishlist, id, user, 'Запись списка желаемого не найдена');
  if (body.wish_type !== undefined && !WISH_TYPES.includes(body.wish_type)) throw invalid('Укажите тип пометки');
  if (body.platform_id != null) ensurePlatform(db.games.find((g) => g.id === item.game_id), body.platform_id);
  for (const field of ['wish_type', 'platform_id', 'note']) {
    if (body[field] !== undefined) item[field] = body[field];
  }
  return { status: 200, data: wishRead(db, item) };
}

function moveToCollection(db, id, body, user) {
  const wish = ownItem(db.wishlist, id, user, 'Запись списка желаемого не найдена');
  const result = addToCollection(db, { ...body, game_id: wish.game_id }, user);
  db.wishlist = db.wishlist.filter((i) => i.id !== wish.id);
  return result;
}

const round1 = (value) => Math.round(value * 10) / 10;

function stats(db, user) {
  const items = db.collection.filter((i) => i.user_id === user.id);
  const completed = items.filter((i) => i.status === 'completed').length;
  const byPlatform = new Map();
  for (const item of items) {
    const name = platformOf(db, item.platform_id).name;
    const entry = byPlatform.get(name) ?? { platform: name, count: 0, hours: 0 };
    entry.count += 1;
    entry.hours += item.hours_played;
    byPlatform.set(name, entry);
  }
  const titleOf = (i) => db.games.find((g) => g.id === i.game_id).title;
  return {
    status: 200,
    data: {
      total_games: items.length,
      completed_games: completed,
      total_hours: round1(items.reduce((sum, i) => sum + i.hours_played, 0)),
      completion_percent: items.length ? round1((completed / items.length) * 100) : 0,
      wishlist_count: db.wishlist.filter((i) => i.user_id === user.id).length,
      by_status: STATUSES.map((status) => ({ status, count: items.filter((i) => i.status === status).length })),
      by_platform: [...byPlatform.values()]
        .map((p) => ({ ...p, hours: round1(p.hours) }))
        .sort((a, b) => b.count - a.count || (a.platform < b.platform ? -1 : 1)),
      top_by_hours: items
        .filter((i) => i.hours_played > 0)
        .sort((a, b) => b.hours_played - a.hours_played || (titleOf(a) < titleOf(b) ? -1 : 1))
        .slice(0, 5)
        .map((i) => ({ title: titleOf(i), platform: platformOf(db, i.platform_id).name, hours: i.hours_played })),
    },
  };
}

async function route(db, config) {
  const method = (config.method ?? 'get').toUpperCase();
  const path = config.url.split('?')[0];
  const params = config.params ?? {};
  const body = parseBody(config);
  let match;

  if (method === 'POST' && path === '/auth/register') return register(db, body);
  if (method === 'POST' && path === '/auth/login') return login(db, body);
  if (method === 'GET' && path === '/auth/me') return { status: 200, data: userRead(currentUser(db, config)) };
  if (method === 'GET' && path === '/genres') return { status: 200, data: [...db.genres].sort((a, b) => (a.name < b.name ? -1 : 1)) };
  if (method === 'GET' && path === '/platforms') return { status: 200, data: [...db.platforms].sort((a, b) => (a.name < b.name ? -1 : 1)) };
  if (method === 'GET' && path === '/health') return { status: 200, data: { status: 'ok' } };

  if (path === '/games') {
    if (method === 'GET') return listGames(db, params, currentUser(db, config, false));
    if (method === 'POST') return createGame(db, body, currentUser(db, config));
  }
  if ((match = path.match(/^\/games\/(\d+)$/))) {
    if (method === 'GET') return { status: 200, data: gameRead(db, visibleGame(db, match[1], currentUser(db, config, false))) };
    if (method === 'PUT') return updateGame(db, match[1], body, currentUser(db, config));
    if (method === 'DELETE') return deleteGame(db, match[1], currentUser(db, config));
  }

  if (path === '/collection') {
    if (method === 'GET') return listCollection(db, params, currentUser(db, config));
    if (method === 'POST') return addToCollection(db, body, currentUser(db, config));
  }
  if ((match = path.match(/^\/collection\/(\d+)$/))) {
    const user = currentUser(db, config);
    if (method === 'GET') return { status: 200, data: itemRead(db, ownItem(db.collection, match[1], user, 'Запись коллекции не найдена')) };
    if (method === 'PUT') return updateCollectionItem(db, match[1], body, user);
    if (method === 'DELETE') {
      const item = ownItem(db.collection, match[1], user, 'Запись коллекции не найдена');
      db.collection = db.collection.filter((i) => i.id !== item.id);
      return { status: 204, data: '' };
    }
  }

  if (path === '/wishlist') {
    if (method === 'GET') return listWishlist(db, params, currentUser(db, config));
    if (method === 'POST') return addToWishlist(db, body, currentUser(db, config));
  }
  if ((match = path.match(/^\/wishlist\/(\d+)\/move-to-collection$/)) && method === 'POST') {
    return moveToCollection(db, match[1], body, currentUser(db, config));
  }
  if ((match = path.match(/^\/wishlist\/(\d+)$/))) {
    const user = currentUser(db, config);
    if (method === 'PUT') return updateWish(db, match[1], body, user);
    if (method === 'DELETE') {
      const item = ownItem(db.wishlist, match[1], user, 'Запись списка желаемого не найдена');
      db.wishlist = db.wishlist.filter((i) => i.id !== item.id);
      return { status: 204, data: '' };
    }
  }

  if (method === 'GET' && path === '/stats') return stats(db, currentUser(db, config));

  throw notFound('Not Found');
}

/** Адаптер Axios: обрабатывает запрос в браузере вместо отправки на сервер. */
export default async function demoAdapter(config) {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const db = load();
  try {
    const { status, data } = await route(db, config);
    save(db);
    return { data, status, statusText: 'OK', headers: {}, config, request: {} };
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    const response = {
      data: { detail: error.detail, ...(error.errors && { errors: error.errors }) },
      status: error.status,
      statusText: '',
      headers: {},
      config,
      request: {},
    };
    throw new AxiosError(error.detail, AxiosError.ERR_BAD_REQUEST, config, {}, response);
  }
}
