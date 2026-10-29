import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';

import { collectionApi, wishlistApi } from '../api/endpoints';
import CollectionFormModal from '../components/CollectionFormModal';
import WishlistFormModal from '../components/WishlistFormModal';
import { useAuth } from '../context/AuthContext';

/** Действия с игрой из библиотеки: «В коллекцию» и «В желаемое». Гостя отправляет на вход. */
export default function useGameActions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [collectionGame, setCollectionGame] = useState(null);
  const [wishlistGame, setWishlistGame] = useState(null);

  const requireUser = (action) => (game) => {
    if (!user) {
      message.info('Войдите, чтобы вести свою коллекцию');
      navigate('/login');
      return;
    }
    action(game);
  };

  const modals = (
    <>
      <CollectionFormModal
        open={Boolean(collectionGame)}
        title="Добавление в коллекцию"
        okText="Добавить"
        game={collectionGame}
        onClose={() => setCollectionGame(null)}
        onSubmit={async (values) => {
          await collectionApi.create({ ...values, game_id: collectionGame.id });
          message.success(`«${collectionGame.title}» добавлена в коллекцию`);
        }}
      />
      <WishlistFormModal
        open={Boolean(wishlistGame)}
        title="Добавление в список желаемого"
        game={wishlistGame}
        onClose={() => setWishlistGame(null)}
        onSubmit={async (values) => {
          await wishlistApi.create({ ...values, game_id: wishlistGame.id });
          message.success(`«${wishlistGame.title}» добавлена в список желаемого`);
        }}
      />
    </>
  );

  return {
    addToCollection: requireUser(setCollectionGame),
    addToWishlist: requireUser(setWishlistGame),
    modals,
  };
}
