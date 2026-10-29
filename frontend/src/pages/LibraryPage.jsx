import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Card, Checkbox, Col, Empty, Input, Pagination, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import { HeartOutlined, PlusOutlined } from '@ant-design/icons';

import { getErrorMessage } from '../api/client';
import { gamesApi } from '../api/endpoints';
import GameCover from '../components/GameCover';
import GameFormModal from '../components/GameFormModal';
import { useAuth } from '../context/AuthContext';
import useCatalog from '../hooks/useCatalog';
import useGameActions from '../hooks/useGameActions';

const PAGE_SIZE = 12;

export default function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { platformOptions, genreOptions } = useCatalog();
  const { addToCollection, addToWishlist, modals } = useGameActions();

  const [filters, setFilters] = useState({ search: '', platform_id: undefined, genre_id: undefined, only_custom: false });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    gamesApi
      .list({ ...filters, search: filters.search || undefined, page, page_size: PAGE_SIZE })
      .then((result) => !cancelled && setData(result))
      .catch((e) => !cancelled && setError(getErrorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters, page, user, reloadKey]);

  const changeFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleGameCreated = (game) => {
    message.success(`Игра «${game.title}» добавлена`);
    setReloadKey((key) => key + 1);
    // Сразу предлагаем занести новую игру в коллекцию
    addToCollection(game);
  };

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={2} className="page-title">Библиотека игр</Typography.Title>
        {user && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setGameFormOpen(true)}>
            Добавить игру вручную
          </Button>
        )}
      </Space>

      {!user && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Вы просматриваете библиотеку как гость"
          description={<span><Link to="/login">Войдите</Link> или <Link to="/register">зарегистрируйтесь</Link>, чтобы вести свою коллекцию, прогресс и список желаемого.</span>}
        />
      )}

      <Row gutter={[12, 12]} className="filters">
        <Col xs={24} md={10}>
          <Input.Search placeholder="Поиск по названию" allowClear onSearch={(value) => changeFilter('search', value.trim())} />
        </Col>
        <Col xs={12} md={5}>
          <Select style={{ width: '100%' }} placeholder="Платформа" allowClear options={platformOptions} value={filters.platform_id} onChange={(v) => changeFilter('platform_id', v)} />
        </Col>
        <Col xs={12} md={5}>
          <Select style={{ width: '100%' }} placeholder="Жанр" allowClear options={genreOptions} value={filters.genre_id} onChange={(v) => changeFilter('genre_id', v)} />
        </Col>
        {user && (
          <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox checked={filters.only_custom} onChange={(e) => changeFilter('only_custom', e.target.checked)}>
              Только мои игры
            </Checkbox>
          </Col>
        )}
      </Row>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Spin spinning={loading}>
        {data.items.length === 0 && !loading ? (
          <Empty description="Игры не найдены" />
        ) : (
          <Row gutter={[16, 16]}>
            {data.items.map((game) => (
              <Col key={game.id} xs={12} sm={8} md={6} lg={4}>
                <Card
                  hoverable
                  className="game-card"
                  cover={<GameCover game={game} />}
                  onClick={() => navigate(`/games/${game.id}`)}
                  actions={[
                    <Button key="add" type="link" size="small" icon={<PlusOutlined />} title="В коллекцию"
                      onClick={(e) => { e.stopPropagation(); addToCollection(game); }}>
                      В коллекцию
                    </Button>,
                    <Button key="wish" type="link" size="small" icon={<HeartOutlined />} title="В желаемое"
                      onClick={(e) => { e.stopPropagation(); addToWishlist(game); }} />,
                  ]}
                >
                  <Card.Meta
                    title={<div className="card-title" title={game.title}>{game.title}</div>}
                    description={
                      <Space size={4} wrap>
                        {game.release_year && <span>{game.release_year}</span>}
                        {game.is_custom && <Tag color="purple">моя</Tag>}
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {data.total > PAGE_SIZE && (
        <Pagination
          style={{ marginTop: 24 }}
          align="center"
          current={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onChange={setPage}
          showSizeChanger={false}
        />
      )}

      {modals}
      <GameFormModal open={gameFormOpen} onClose={() => setGameFormOpen(false)} onSaved={handleGameCreated} />
    </>
  );
}
