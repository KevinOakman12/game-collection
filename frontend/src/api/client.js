import axios from 'axios';

import demoAdapter from './demoBackend';

// Демо-версия для статического хостинга: запросы обрабатываются в браузере без сервера
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

const TOKEN_KEY = 'games_access_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({ baseURL: '/api', timeout: 10000, ...(IS_DEMO && { adapter: demoAdapter }) });

// Перед каждым запросом добавляем токен авторизации, если пользователь вошёл
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// Ответ 401 на защищённый запрос означает, что токен истёк или недействителен
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && tokenStorage.get() && !isLoginRequest) {
      tokenStorage.clear();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

const FIELD_LABELS = {
  username: 'логин',
  email: 'email',
  password: 'пароль',
  title: 'название',
  description: 'описание',
  release_year: 'год выхода',
  developer: 'разработчик',
  cover_url: 'ссылка на обложку',
  genre_id: 'жанр',
  platform_ids: 'платформы',
  platform_id: 'платформа',
  status: 'статус',
  hours_played: 'затраченные часы',
  notes: 'заметки',
  note: 'заметка',
  wish_type: 'тип пометки',
};

/** Превращает ошибку запроса в понятное пользователю сообщение. */
export function getErrorMessage(error) {
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'Сервер не отвечает. Повторите попытку позже'
      : 'Нет соединения с сервером';
  }
  const { status, data } = error.response;
  if (data?.errors?.length) {
    const fields = [...new Set(data.errors.map((e) => FIELD_LABELS[e.field] ?? e.field))];
    return `${data.detail}: ${fields.join(', ')}`;
  }
  if (typeof data?.detail === 'string') {
    return data.detail;
  }
  if (status >= 500) {
    return 'Внутренняя ошибка сервера';
  }
  return 'Не удалось выполнить запрос';
}

export default api;
