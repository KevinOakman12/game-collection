import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';

import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/collection" replace />;
  }

  const handleFinish = async ({ username, password }) => {
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(location.state?.from ?? '/collection', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="auth-card">
      <Typography.Title level={3} style={{ textAlign: 'center', marginTop: 0 }}>Вход</Typography.Title>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          name="username"
          label="Логин или email"
          rules={[{ required: true, whitespace: true, message: 'Введите логин или email' }]}
        >
          <Input prefix={<UserOutlined />} autoComplete="username" autoFocus />
        </Form.Item>
        <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>Войти</Button>
      </Form>
      <Typography.Paragraph style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
        Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
      </Typography.Paragraph>
    </Card>
  );
}
