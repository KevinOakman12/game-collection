import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Col, Empty, List, Progress, Row, Spin, Statistic, Typography } from 'antd';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { getErrorMessage } from '../api/client';
import { statsApi } from '../api/endpoints';
import { STATUSES, formatHours } from '../labels';

export default function StatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    statsApi.get().then(setStats).catch((e) => setError(getErrorMessage(e)));
  }, []);

  if (error) {
    return <Alert type="error" showIcon message={error} />;
  }
  if (!stats) {
    return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />;
  }

  const statusData = stats.by_status
    .filter((s) => s.count > 0)
    .map((s) => ({ name: STATUSES[s.status].label, value: s.count, color: STATUSES[s.status].chart }));

  return (
    <>
      <Typography.Title level={2} className="page-title">Статистика</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Игр в коллекции" value={stats.total_games} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Пройдено" value={stats.completed_games} /></Card></Col>
        <Col xs={12} md={6}>
          <Card><Statistic title="Затрачено времени" value={stats.total_hours} suffix="ч" precision={1} decimalSeparator="," /></Card>
        </Col>
        <Col xs={12} md={6}><Card><Statistic title="В списке желаемого" value={stats.wishlist_count} /></Card></Col>
      </Row>

      {stats.total_games === 0 ? (
        <Empty
          style={{ marginTop: 48 }}
          description="В коллекции пока нет игр — статистика появится после их добавления"
        >
          <Button type="primary" onClick={() => navigate('/')}>Перейти в библиотеку</Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={8}>
            <Card title="Прогресс прохождения" style={{ height: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Progress type="circle" percent={stats.completion_percent} size={160} format={(p) => `${String(p).replace('.', ',')} %`} />
                <Typography.Paragraph style={{ marginTop: 16 }}>
                  Пройдено {stats.completed_games} из {stats.total_games}
                </Typography.Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="Игры по статусам" style={{ height: '100%' }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label>
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="Игры по платформам">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.by_platform}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="platform" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Игр' : name]} />
                  <Bar dataKey="count" name="Игр" fill="#5b4bdb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Больше всего часов" style={{ height: '100%' }}>
              <List
                dataSource={stats.top_by_hours}
                locale={{ emptyText: 'Нет записанного времени' }}
                renderItem={(game) => (
                  <List.Item extra={<strong>{formatHours(game.hours)}</strong>}>
                    <List.Item.Meta title={game.title} description={game.platform} />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}
