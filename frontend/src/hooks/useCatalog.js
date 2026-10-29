import { useEffect, useState } from 'react';

import { catalogApi } from '../api/endpoints';

// Справочники меняются редко, поэтому загружаем их один раз за сеанс
let cache = null;

/** Списки платформ и жанров для фильтров и форм. */
export default function useCatalog() {
  const [catalog, setCatalog] = useState(cache ?? { platforms: [], genres: [] });

  useEffect(() => {
    if (cache) return;
    Promise.all([catalogApi.platforms(), catalogApi.genres()])
      .then(([platforms, genres]) => {
        cache = { platforms, genres };
        setCatalog(cache);
      })
      .catch(() => {
        // Без справочников фильтры просто останутся пустыми
      });
  }, []);

  return {
    ...catalog,
    platformOptions: catalog.platforms.map((p) => ({ value: p.id, label: p.name })),
    genreOptions: catalog.genres.map((g) => ({ value: g.id, label: g.name })),
  };
}
