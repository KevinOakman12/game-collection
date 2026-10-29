import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Dropdown, Layout, Menu, Space } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';

import { IS_DEMO } from '../api/client';
import { useAuth } from '../context/AuthContext';

const GUEST_MENU = [{ key: '/', label: <Link to="/">Библиотека</Link> }];

const USER_MENU = [
  ...GUEST_MENU,
  { key: '/collection', label: <Link to="/collection">Моя коллекция</Link> },
  { key: '/wishlist', label: <Link to="/wishlist">Желаемое</Link> },
  { key: '/stats', label: <Link to="/stats">Статистика</Link> },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = USER_MENU.find((item) => item.key !== '/' && location.pathname.startsWith(item.key))?.key ?? '/';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {IS_DEMO && (
        <Alert
          banner
          type="warning"
          message="Демо-версия: сервер не используется, учётные записи и коллекция хранятся только в этом браузере"
        />
      )}
      <Layout.Header className="app-header">
        <Link to="/" className="app-logo">🎮 Игровая полка</Link>
        <Menu
          className="app-menu"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={user ? USER_MENU : GUEST_MENU}
        />
        {user ? (
          <Dropdown
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Выйти' }],
              onClick: handleLogout,
            }}
          >
            <Button icon={<UserOutlined />}>{user.username}</Button>
          </Dropdown>
        ) : (
          <Space>
            <Button onClick={() => navigate('/login')}>Войти</Button>
            <Button type="primary" onClick={() => navigate('/register')}>Регистрация</Button>
          </Space>
        )}
      </Layout.Header>
      <Layout.Content className="app-content">
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
