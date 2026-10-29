import api from './client';

export const authApi = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  // Эндпоинт входа принимает данные формы по стандарту OAuth2
  login: (username, password) =>
    api
      .post('/auth/login', new URLSearchParams({ username, password }))
      .then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const catalogApi = {
  genres: () => api.get('/genres').then((r) => r.data),
  platforms: () => api.get('/platforms').then((r) => r.data),
};

export const gamesApi = {
  list: (params) => api.get('/games', { params }).then((r) => r.data),
  get: (id) => api.get(`/games/${id}`).then((r) => r.data),
  create: (data) => api.post('/games', data).then((r) => r.data),
  update: (id, data) => api.put(`/games/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/games/${id}`),
};

export const collectionApi = {
  list: (params) => api.get('/collection', { params }).then((r) => r.data),
  create: (data) => api.post('/collection', data).then((r) => r.data),
  update: (id, data) => api.put(`/collection/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/collection/${id}`),
};

export const wishlistApi = {
  list: (params) => api.get('/wishlist', { params }).then((r) => r.data),
  create: (data) => api.post('/wishlist', data).then((r) => r.data),
  update: (id, data) => api.put(`/wishlist/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/wishlist/${id}`),
  moveToCollection: (id, data) =>
    api.post(`/wishlist/${id}/move-to-collection`, data).then((r) => r.data),
};

export const statsApi = {
  get: () => api.get('/stats').then((r) => r.data),
};
