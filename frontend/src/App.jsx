import { Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import CollectionPage from './pages/CollectionPage';
import GamePage from './pages/GamePage';
import LibraryPage from './pages/LibraryPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import StatsPage from './pages/StatsPage';
import WishlistPage from './pages/WishlistPage';

const protect = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Доступно гостю */}
        <Route path="/" element={<LibraryPage />} />
        <Route path="/games/:id" element={<GamePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Только для зарегистрированного пользователя */}
        <Route path="/collection" element={protect(<CollectionPage />)} />
        <Route path="/wishlist" element={protect(<WishlistPage />)} />
        <Route path="/stats" element={protect(<StatsPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
