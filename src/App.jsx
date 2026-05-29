import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import JoinPage from './pages/JoinPage';
import LobbyPage from './pages/LobbyPage';
import HidingPage from './pages/HidingPage';
import GamePage from './pages/GamePage';
import EndPage from './pages/EndPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? '/home' : '/auth'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
          <Route path="/join" element={<ProtectedRoute><JoinPage /></ProtectedRoute>} />
          <Route path="/join/:code" element={<ProtectedRoute><JoinPage /></ProtectedRoute>} />
          <Route path="/lobby/:sessionId" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
          <Route path="/game/:sessionId/hiding" element={<ProtectedRoute><HidingPage /></ProtectedRoute>} />
          <Route path="/game/:sessionId/play" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
          <Route path="/game/:sessionId/end" element={<ProtectedRoute><EndPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
