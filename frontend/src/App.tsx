// App.tsx — theme root + React Router route table. The .app wrapper carries the
// CSS-var tokens + data-theme; Layout provides the authenticated shell.
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout';
import Login from './pages/Login';
import ListsOverview from './pages/ListsOverview';
import ListDetail from './pages/ListDetail';
import StoresPage from './pages/Stores';
import History from './pages/History';
import Settings from './pages/Settings';
import AdminProducts from './pages/AdminProducts';
import AdminUsers from './pages/AdminUsers';

export default function App() {
  const { dark, appStyle } = useTheme();
  return (
    <div
      className="app ff-body"
      data-theme={dark ? 'dark' : 'light'}
      style={{ ...appStyle, height: '100%' }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/lists" replace />} />
          <Route path="/lists" element={<ListsOverview />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="*" element={<Navigate to="/lists" replace />} />
        </Route>
      </Routes>
    </div>
  );
}
