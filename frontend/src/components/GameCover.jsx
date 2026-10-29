import { useState } from 'react';

function initials(title) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/** Обложка игры по ссылке. Если ссылки нет или картинка не загрузилась — заглушка с инициалами. */
export default function GameCover({ game, className }) {
  const [failed, setFailed] = useState(false);

  const content =
    game.cover_url && !failed ? (
      <img
        className="game-cover"
        src={game.cover_url}
        alt={game.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    ) : (
      <div className="game-cover-placeholder">{initials(game.title)}</div>
    );

  return className ? <div className={className}>{content}</div> : content;
}
