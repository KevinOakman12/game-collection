import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';

import { setUnauthorizedHandler, tokenStorage } from '../api/client';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Пока проверяем сохранённый токен, защищённые страницы не открываем и не перенаправляем
  const [loading, setLoading] = useState(Boolean(tokenStorage.get()));
  const navigate = useNavigate();
  const { message } = App.useApp();

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Восстановление сеанса после перезагрузки страницы
  useEffect(() => {
    if (!tokenStorage.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      message.warning('Сеанс истёк. Войдите снова');
      navigate('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [message, navigate]);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    tokenStorage.set(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (values) => {
      await authApi.register(values);
      return login(values.username, values.password);
    },
    [login],
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
