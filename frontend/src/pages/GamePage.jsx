import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Button, Col, Descriptions, Popconfirm, Result, Row, Space, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, HeartOutlined, PlusOutlined } from '@ant-design/icons';

import { getErrorMessage } from '../api/client';
import { gamesApi } from '../api/endpoints';
import GameCover from '../components/GameCover';
import GameFormModal from '../components/GameFormModal';
import { useAuth } from '../context/AuthContext';
import useGameActions from '../hooks/useGameActions';

export default function GamePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { addToCollection, addToWishlist, modals } = useGameActions();
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setGame(null);
    setError(null);
    gamesApi
      .get(id)
      .then(setGame)
      .catch((e) => setError(e.response?.status === 404 ? 'Игра не найдена' : getErrorMessage(e)));
  }, [id, user]);

  if (error) {
    return (
      <Result
        status={error === 'Игра не найдена' ? '404' : 'error'}
        title={error}
        extra={<Button onClick={() => navigate('/')}>В библиотеку</Button>}
      />
    );
  }
  if (!game) {
    return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />;
  }

  const handleDelete = async () => {
    try {
      await gamesApi.remove(game.id);
      message.success('Игра удалена');
      navigate('/');
    } catch (e) {
      message.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ paddingLeft: 0 }}>
        Назад
      </Button>
      <Row gutter={[32, 24]} style={{ marginTop: 8 }}>
        <Col xs={24} sm={8}>
          <GameCover game={game} className="game-cover-large" />
        </Col>
        <Col xs={24} sm={16}>
          <Typography.Title level={2} className="page-title">
            {game.title} {game.is_custom && <Tag color="purple">добавлена вручную</Tag>}
          </Typography.Title>
          <Descriptions
            column={1}
            items={[
              { key: 'developer', label: 'Разработчик', children: game.developer ?? '—' },
              { key: 'year', label: 'Год выхода', children: game.release_year ?? '—' },
              { key: 'genre', label: 'Жанр', children: game.genre?.name ?? '—' },
              {
                key: 'platforms',
                label: 'Платформы',
                children: <Space size={[4, 4]} wrap>{game.platforms.map((p) => <Tag key={p.id}>{p.name}</Tag>)}</Space>,
              },
            ]}
          />
          {game.description && <Typography.Paragraph style={{ marginTop: 16 }}>{game.description}</Typography.Paragraph>}
          <Space wrap style={{ marginTop: 8 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => addToCollection(game)}>В коллекцию</Button>
            <Button icon={<HeartOutlined />} onClick={() => addToWishlist(game)}>В желаемое</Button>
            {game.is_custom && (
              <>
                <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Изменить</Button>
                <Popconfirm
                  title="Удалить игру?"
                  description="Игра будет удалена из коллекции и списка желаемого"
                  okText="Удалить"
                  cancelText="Отмена"
                  okButtonProps={{ danger: true }}
                  onConfirm={handleDelete}
                >
                  <Button danger icon={<DeleteOutlined />}>Удалить</Button>
                </Popconfirm>
              </>
            )}
          </Space>
        </Col>
      </Row>
      {modals}
      <GameFormModal
        open={editOpen}
        game={game}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setGame(saved);
          message.success('Изменения сохранены');
        }}
      />
    </>
  );
}
