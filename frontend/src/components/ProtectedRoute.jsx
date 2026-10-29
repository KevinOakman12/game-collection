import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';

import { useAuth } from '../context/AuthContext';

/** Пропускает только авторизованного пользователя, гостя отправляет на страницу входа. */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
