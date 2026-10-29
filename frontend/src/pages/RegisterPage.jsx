import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';

import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/collection" replace />;
  }

  const handleFinish = async ({ username, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      await register({ username, email, password });
      navigate('/collection', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="auth-card">
      <Typography.Title level={3} style={{ textAlign: 'center', marginTop: 0 }}>Регистрация</Typography.Title>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          name="username"
          label="Логин"
          extra="От 3 до 50 символов: латинские буквы, цифры и знак подчёркивания"
          rules={[
            { required: true, message: 'Введите логин' },
            { min: 3, max: 50, message: 'Длина логина — от 3 до 50 символов' },
            { pattern: /^[A-Za-z0-9_]+$/, message: 'Допустимы только латинские буквы, цифры и «_»' },
          ]}
        >
          <Input autoComplete="username" autoFocus />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Введите email' },
            { type: 'email', message: 'Некорректный email' },
          ]}
        >
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Пароль"
          rules={[
            { required: true, message: 'Введите пароль' },
            { min: 6, message: 'Пароль должен содержать не менее 6 символов' },
            { max: 72, message: 'Пароль слишком длинный' },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Повторите пароль"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Повторите пароль' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Пароли не совпадают')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>Зарегистрироваться</Button>
      </Form>
      <Typography.Paragraph style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
        Уже есть аккаунт? <Link to="/login">Войдите</Link>
      </Typography.Paragraph>
    </Card>
  );
}
