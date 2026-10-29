import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, App, Button, Empty, Popconfirm, Segmented, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, ExportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { getErrorMessage } from '../api/client';
import { wishlistApi } from '../api/endpoints';
import CollectionFormModal from '../components/CollectionFormModal';
import GameCover from '../components/GameCover';
import WishlistFormModal from '../components/WishlistFormModal';
import { WISH_TYPES, WISH_TYPE_OPTIONS } from '../labels';

const FILTER_OPTIONS = [{ value: 'all', label: 'Все' }, ...WISH_TYPE_OPTIONS];

export default function WishlistPage() {
  const { message } = App.useApp();
  const [wishType, setWishType] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [moving, setMoving] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    wishlistApi
      .list({ wish_type: wishType === 'all' ? undefined : wishType })
      .then(setItems)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [wishType]);

  useEffect(load, [load]);

  const handleDelete = async (item) => {
    try {
      await wishlistApi.remove(item.id);
      message.success(`«${item.game.title}» удалена из списка желаемого`);
      load();
    } catch (e) {
      message.error(getErrorMessage(e));
    }
  };

  const columns = [
    { title: '', key: 'cover', width: 64, render: (_, item) => <GameCover game={item.game} className="game-cover-small" /> },
    {
      title: 'Игра',
      key: 'title',
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Link to={`/games/${item.game.id}`}>{item.game.title}</Link>
          {item.note && <Typography.Text type="secondary">{item.note}</Typography.Text>}
        </Space>
      ),
    },
    {
      title: 'Пометка',
      dataIndex: 'wish_type',
      render: (type) => <Tag color={WISH_TYPES[type].tag}>{WISH_TYPES[type].label}</Tag>,
    },
    { title: 'Платформа', key: 'platform', render: (_, item) => item.platform?.name ?? 'Любая' },
    { title: 'Добавлена', dataIndex: 'added_at', responsive: ['md'], render: (value) => dayjs(value).format('D MMM YYYY') },
    {
      title: '',
      key: 'actions',
      width: 150,
      render: (_, item) => (
        <Space>
          <Tooltip title="Перенести в коллекцию">
            <Button type="primary" icon={<ExportOutlined />} onClick={() => setMoving(item)} />
          </Tooltip>
          <Tooltip title="Изменить пометку">
            <Button icon={<EditOutlined />} onClick={() => setEditing(item)} />
          </Tooltip>
          <Popconfirm
            title="Удалить из списка желаемого?"
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(item)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Typography.Title level={2} className="page-title">Список желаемого</Typography.Title>
      <Segmented options={FILTER_OPTIONS} value={wishType} onChange={setWishType} className="filters" />

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: 640 }}
        locale={{ emptyText: <Empty description="Список пуст. Отмечайте игры в библиотеке кнопкой «В желаемое»" /> }}
      />

      <WishlistFormModal
        open={Boolean(editing)}
        title="Изменение пометки"
        game={editing?.game}
        initialValues={editing && { wish_type: editing.wish_type, platform_id: editing.platform?.id, note: editing.note }}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          await wishlistApi.update(editing.id, values);
          message.success('Пометка изменена');
          load();
        }}
      />

      <CollectionFormModal
        open={Boolean(moving)}
        title="Перенос в коллекцию"
        okText="Перенести"
        game={moving?.game}
        initialValues={moving?.platform && { platform_id: moving.platform.id }}
        onClose={() => setMoving(null)}
        onSubmit={async (values) => {
          await wishlistApi.moveToCollection(moving.id, values);
          message.success(`«${moving.game.title}» перенесена в коллекцию`);
          load();
        }}
      />
    </>
  );
}
