import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Col, Empty, Input, Popconfirm, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { getErrorMessage } from '../api/client';
import { collectionApi } from '../api/endpoints';
import CollectionFormModal from '../components/CollectionFormModal';
import GameCover from '../components/GameCover';
import useCatalog from '../hooks/useCatalog';
import { STATUSES, STATUS_OPTIONS, formatHours } from '../labels';

const SORT_OPTIONS = [
  { value: 'updated:desc', label: 'Недавно изменённые' },
  { value: 'added:desc', label: 'Недавно добавленные' },
  { value: 'title:asc', label: 'По названию' },
  { value: 'hours:desc', label: 'Больше всего часов' },
];

export default function CollectionPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { platformOptions } = useCatalog();
  const [filters, setFilters] = useState({ search: '', status: undefined, platform_id: undefined, sort: 'updated:desc' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    const [sort, order] = filters.sort.split(':');
    setLoading(true);
    setError(null);
    collectionApi
      .list({ search: filters.search || undefined, status: filters.status, platform_id: filters.platform_id, sort, order })
      .then(setItems)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(load, [load]);

  const changeFilter = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));
  const hasFilters = Boolean(filters.search || filters.status || filters.platform_id);

  const handleDelete = async (item) => {
    try {
      await collectionApi.remove(item.id);
      message.success(`«${item.game.title}» удалена из коллекции`);
      load();
    } catch (e) {
      message.error(getErrorMessage(e));
    }
  };

  const columns = [
    {
      title: '',
      key: 'cover',
      width: 64,
      render: (_, item) => <GameCover game={item.game} className="game-cover-small" />,
    },
    {
      title: 'Игра',
      key: 'title',
      render: (_, item) => (
        <Space direction="vertical" size={0}>
          <Link to={`/games/${item.game.id}`}>{item.game.title}</Link>
          {item.notes && <Typography.Text type="secondary" ellipsis style={{ maxWidth: 320 }}>{item.notes}</Typography.Text>}
        </Space>
      ),
    },
    { title: 'Платформа', key: 'platform', render: (_, item) => item.platform.name },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (status) => <Tag color={STATUSES[status].tag}>{STATUSES[status].label}</Tag>,
    },
    { title: 'Затрачено', dataIndex: 'hours_played', align: 'right', render: formatHours },
    {
      title: 'Изменено',
      dataIndex: 'updated_at',
      responsive: ['md'],
      render: (value) => dayjs(value).format('D MMM YYYY'),
    },
    {
      title: '',
      key: 'actions',
      width: 96,
      render: (_, item) => (
        <Space>
          <Tooltip title="Изменить прогресс">
            <Button icon={<EditOutlined />} onClick={() => setEditing(item)} />
          </Tooltip>
          <Popconfirm
            title="Удалить из коллекции?"
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
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Typography.Title level={2} className="page-title">Моя коллекция</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/')}>Добавить из библиотеки</Button>
      </Space>

      <Row gutter={[12, 12]} className="filters">
        <Col xs={24} md={9}>
          <Input.Search placeholder="Поиск по названию" allowClear onSearch={(value) => changeFilter('search', value.trim())} />
        </Col>
        <Col xs={12} md={5}>
          <Select style={{ width: '100%' }} placeholder="Статус" allowClear options={STATUS_OPTIONS} value={filters.status} onChange={(v) => changeFilter('status', v)} />
        </Col>
        <Col xs={12} md={5}>
          <Select style={{ width: '100%' }} placeholder="Платформа" allowClear options={platformOptions} value={filters.platform_id} onChange={(v) => changeFilter('platform_id', v)} />
        </Col>
        <Col xs={24} md={5}>
          <Select style={{ width: '100%' }} options={SORT_OPTIONS} value={filters.sort} onChange={(v) => changeFilter('sort', v)} />
        </Col>
      </Row>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: 640 }}
        locale={{
          emptyText: (
            <Empty description={hasFilters ? 'Ничего не найдено' : 'Коллекция пуста. Добавьте игры из библиотеки'} />
          ),
        }}
      />

      <CollectionFormModal
        open={Boolean(editing)}
        title="Прогресс по игре"
        game={editing?.game}
        initialValues={
          editing && {
            platform_id: editing.platform.id,
            status: editing.status,
            hours_played: editing.hours_played,
            notes: editing.notes,
          }
        }
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          await collectionApi.update(editing.id, values);
          message.success('Прогресс сохранён');
          load();
        }}
      />
    </>
  );
}
