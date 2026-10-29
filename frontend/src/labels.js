// Подписи и цвета статусов прохождения и пометок списка желаемого

export const STATUSES = {
  not_started: { label: 'Не начата', tag: 'default', chart: '#a3a3b8' },
  in_progress: { label: 'В процессе', tag: 'processing', chart: '#1677ff' },
  completed: { label: 'Пройдена', tag: 'success', chart: '#52c41a' },
  abandoned: { label: 'Заброшена', tag: 'error', chart: '#ff4d4f' },
};

export const STATUS_OPTIONS = Object.entries(STATUSES).map(([value, { label }]) => ({ value, label }));

export const WISH_TYPES = {
  buy: { label: 'Хочу купить', tag: 'gold' },
  play: { label: 'Хочу сыграть', tag: 'purple' },
};

export const WISH_TYPE_OPTIONS = Object.entries(WISH_TYPES).map(([value, { label }]) => ({ value, label }));

export const formatHours = (hours) =>
  `${Number(hours).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;
